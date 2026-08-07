-- =========================================================
-- Fase 1 do PRD "Portal dos Ministérios": renomeia o modelo
-- genérico de cliente/empresa para o vocabulário do PRD
-- (ministério, demanda, campanha, entrega) e adiciona as
-- entidades que faltam. Migration ADITIVA — não apaga nada
-- do que já rodou em produção (0001, 0002, 0003).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Renomeia organization -> ministry em todo o schema
-- ---------------------------------------------------------
do $$
begin
  if to_regclass('public.organizations') is not null and to_regclass('public.ministries') is null then
    execute 'alter table organizations rename to ministries';
  end if;
  if to_regclass('public.organization_members') is not null and to_regclass('public.ministry_members') is null then
    execute 'alter table organization_members rename to ministry_members';
  end if;
end $$;

alter table ministry_members rename column organization_id to ministry_id;
alter table data_sources rename column organization_id to ministry_id;
alter table metrics rename column organization_id to ministry_id;

-- asana_tasks só existe se a migration 0002 já rodou nesse banco —
-- essa migration funciona com ou sem ela.
do $$
begin
  if to_regclass('public.asana_tasks') is not null then
    execute 'alter table asana_tasks rename column organization_id to ministry_id';
  end if;
end $$;

-- ---------------------------------------------------------
-- 2. Campos do ministério (PRD 8.3)
-- ---------------------------------------------------------
alter table ministries
  add column if not exists description text,
  add column if not exists sigla text,
  add column if not exists categoria text
    check (categoria in ('ministerio', 'rede', 'programa', 'area_institucional', 'evento_recorrente'))
    default 'ministerio',
  add column if not exists pastor_responsavel text,
  add column if not exists ponto_focal_ministerio text,
  add column if not exists ponto_focal_comunicacao text,
  add column if not exists status text
    check (status in ('ativo', 'pausado', 'arquivado'))
    not null default 'ativo',
  add column if not exists centro_custo text,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------
-- 3. Papel global do usuário (PRD 5.2)
-- Atendimento/Gestor de Comunicação/Administrador técnico
-- enxergam além de um único ministério.
-- ---------------------------------------------------------
alter table profiles
  add column if not exists papel_global text
    check (papel_global in ('nenhum', 'atendimento', 'gestor_comunicacao', 'administrador_tecnico'))
    not null default 'nenhum';

-- migra o antigo flag booleano pro novo modelo de papel
update profiles set papel_global = 'gestor_comunicacao'
  where is_agency_admin = true and papel_global = 'nenhum';

-- ---------------------------------------------------------
-- 4. Perfis por ministério (PRD 5.2): leitor, colaborador,
-- aprovador, supervisor, atendimento (carteira designada)
-- ---------------------------------------------------------

-- migra valores antigos ('owner'/'member', de 0001) pro novo vocabulário
-- ANTES de trocar a constraint, senão a ADD CONSTRAINT falha validando
-- linhas existentes que não batem com os novos valores permitidos.
update ministry_members set role = 'atendimento' where role = 'owner';
update ministry_members set role = 'leitor' where role = 'member';

alter table ministry_members drop constraint if exists organization_members_role_check;
alter table ministry_members
  add constraint ministry_members_role_check
  check (role in ('leitor', 'colaborador', 'aprovador', 'supervisor', 'atendimento'));
alter table ministry_members alter column role set default 'leitor';

-- ---------------------------------------------------------
-- 5. Campanhas e eventos (PRD 8.5)
-- ---------------------------------------------------------
create sequence if not exists campaign_seq;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  identificador text unique,
  ministry_id uuid not null references ministries (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in (
    'campanha', 'evento', 'lancamento', 'serie', 'acao_recorrente', 'projeto_institucional'
  )),
  objetivo_estrategico text,
  publico_prioritario text,
  mensagem_principal text,
  data_inicio date,
  data_termino date,
  data_evento date,
  fase text not null default 'descoberta_briefing' check (fase in (
    'descoberta_briefing', 'planejamento', 'criacao', 'producao',
    'aprovacao', 'distribuicao_execucao', 'monitoramento', 'encerramento_aprendizado'
  )),
  saude text not null default 'no_caminho' check (saude in (
    'no_caminho', 'atencao', 'critica', 'pausada', 'concluida'
  )),
  responsavel_comunicacao uuid references profiles (id),
  responsavel_ministerio uuid references profiles (id),
  escopo_macro text,
  canais_envolvidos text,
  orcamento_planejado numeric,
  orcamento_aprovado numeric,
  investimento_realizado numeric,
  resultados_observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_campaign_identificador()
returns trigger as $$
begin
  if new.identificador is null then
    new.identificador := 'CAM-' || extract(year from now())::text || '-' ||
      lpad(nextval('campaign_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_campaign_identificador on campaigns;
create trigger trg_campaign_identificador
  before insert on campaigns
  for each row execute procedure public.set_campaign_identificador();

-- ministérios participantes (além do ministério responsável)
create table if not exists campaign_ministries (
  campaign_id uuid not null references campaigns (id) on delete cascade,
  ministry_id uuid not null references ministries (id) on delete cascade,
  primary key (campaign_id, ministry_id)
);

-- marcos da campanha, usados no cálculo de progresso ponderado (PRD 8.5)
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  nome text not null,
  peso numeric not null default 1,
  concluido boolean not null default false,
  data_prevista date,
  data_conclusao date,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. Demandas (PRD 8.4)
-- Substitui asana_tasks como fonte principal de tarefas —
-- a sincronização com o Asana passa a gravar aqui.
-- ---------------------------------------------------------
create sequence if not exists demand_seq;

create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  identificador text unique,
  ministry_id uuid not null references ministries (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  titulo text not null,
  descricao_objetiva text,
  tipo_servico text,
  objetivo_entrega text,
  escopo_acordado text,
  prioridade text check (prioridade in ('baixa', 'media', 'alta', 'urgente')) default 'media',
  status text not null default 'recebida' check (status in (
    'recebida', 'em_triagem', 'aguardando_briefing', 'planejada', 'em_producao', 'em_revisao_interna',
    'aguardando_ministerio', 'aguardando_aprovacao', 'ajustes_solicitados', 'aprovada',
    'agendada_ou_publicada', 'concluida', 'pausada', 'cancelada'
  )),
  fase_atual text,
  responsavel_interface uuid references profiles (id),
  responsavel_ministerio uuid references profiles (id),
  data_solicitacao date default current_date,
  data_inicio date,
  prazo_acordado date,
  data_conclusao date,
  dependencias text,
  pendencia_atual text,
  esforco_planejado numeric,
  esforco_realizado numeric,
  percentual_avanco numeric,
  aprovador uuid references profiles (id),
  observacao_publicada text,
  observacao_interna text,
  fonte_externa text not null default 'manual' check (fonte_externa in ('manual', 'asana')),
  asana_task_gid text,
  link_origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ministry_id, asana_task_gid)
);

create index if not exists demands_ministry_status_idx on demands (ministry_id, status);
create index if not exists demands_campaign_idx on demands (campaign_id);

create or replace function public.set_demand_identificador()
returns trigger as $$
begin
  if new.identificador is null then
    new.identificador := 'DEM-' || extract(year from now())::text || '-' ||
      lpad(nextval('demand_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_demand_identificador on demands;
create trigger trg_demand_identificador
  before insert on demands
  for each row execute procedure public.set_demand_identificador();

-- ---------------------------------------------------------
-- 7. Entregas e arquivos (PRD 8.10)
-- ---------------------------------------------------------
create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references ministries (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  demand_id uuid references demands (id) on delete set null,
  titulo text not null,
  tipo_arquivo text,
  versao text,
  status text not null default 'rascunho' check (status in (
    'rascunho', 'para_aprovacao', 'aprovado', 'final', 'arquivado'
  )),
  data_entrega date,
  link_principal text,
  links_complementares jsonb not null default '[]'::jsonb,
  observacao_uso text,
  validade date,
  autor_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists deliverables_ministry_idx on deliverables (ministry_id, status);

-- ---------------------------------------------------------
-- 8. Auditoria essencial (PRD 15.4, exigida já na Fase 1)
-- ---------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  acao text not null,
  entidade_tipo text not null,
  entidade_id uuid,
  valor_anterior jsonb,
  valor_novo jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entidade_idx on audit_log (entidade_tipo, entidade_id);

-- =========================================================
-- 9. Row Level Security das tabelas novas
-- Leitura: qualquer papel vinculado ao ministério (via
-- ministry_members) ou papel_global de Comunicação.
-- Escrita: só Comunicação (atendimento vinculado ao
-- ministério, ou gestor_comunicacao/administrador_tecnico
-- globais) — líderes de ministério consultam, não editam
-- diretamente (PRD 8.4, critério de aceite 18.3).
-- =========================================================

alter table campaigns enable row level security;
alter table campaign_ministries enable row level security;
alter table milestones enable row level security;
alter table demands enable row level security;
alter table deliverables enable row level security;
alter table audit_log enable row level security;

create or replace function public.is_comunicacao_global()
returns boolean as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.papel_global in ('gestor_comunicacao', 'administrador_tecnico')
  );
$$ language sql stable security definer;

create or replace function public.has_ministry_access(target_ministry_id uuid)
returns boolean as $$
  select exists (
    select 1 from ministry_members mm
    where mm.ministry_id = target_ministry_id
      and mm.user_id = auth.uid()
  ) or public.is_comunicacao_global();
$$ language sql stable security definer;

create or replace function public.can_edit_ministry(target_ministry_id uuid)
returns boolean as $$
  select exists (
    select 1 from ministry_members mm
    where mm.ministry_id = target_ministry_id
      and mm.user_id = auth.uid()
      and mm.role = 'atendimento'
  ) or public.is_comunicacao_global();
$$ language sql stable security definer;

create policy "campaigns: acesso por ministério" on campaigns
  for select using (public.has_ministry_access(ministry_id));
create policy "campaign_ministries: acesso por ministério" on campaign_ministries
  for select using (public.has_ministry_access(ministry_id));
create policy "milestones: acesso por ministério" on milestones
  for select using (
    exists (select 1 from campaigns c where c.id = milestones.campaign_id and public.has_ministry_access(c.ministry_id))
  );
create policy "demands: acesso por ministério" on demands
  for select using (public.has_ministry_access(ministry_id));
create policy "deliverables: acesso por ministério" on deliverables
  for select using (public.has_ministry_access(ministry_id));

create policy "audit_log: só Comunicação global" on audit_log
  for select using (public.is_comunicacao_global());

-- Escrita client-side (fora da service role) só para quem pode editar o ministério.
create policy "campaigns: Comunicação edita" on campaigns
  for all using (public.can_edit_ministry(ministry_id))
  with check (public.can_edit_ministry(ministry_id));
create policy "demands: Comunicação edita" on demands
  for all using (public.can_edit_ministry(ministry_id))
  with check (public.can_edit_ministry(ministry_id));
create policy "deliverables: Comunicação edita" on deliverables
  for all using (public.can_edit_ministry(ministry_id))
  with check (public.can_edit_ministry(ministry_id));
create policy "milestones: Comunicação edita" on milestones
  for all using (
    exists (select 1 from campaigns c where c.id = milestones.campaign_id and public.can_edit_ministry(c.ministry_id))
  )
  with check (
    exists (select 1 from campaigns c where c.id = milestones.campaign_id and public.can_edit_ministry(c.ministry_id))
  );

-- ---------------------------------------------------------
-- 10. Atualiza as policies antigas (criadas em 0001/0002) para
-- usar papel_global em vez de is_agency_admin, já que o papel
-- pode agora ser atribuído sem marcar aquele flag legado.
-- ---------------------------------------------------------
drop policy if exists "organizations: membro ou admin da agência vê" on ministries;
create policy "ministries: acesso por vínculo ou Comunicação" on ministries
  for select using (public.has_ministry_access(id));

drop policy if exists "organization_members: membro ou admin da agência vê" on ministry_members;
create policy "ministry_members: acesso por vínculo ou Comunicação" on ministry_members
  for select using (user_id = auth.uid() or public.is_comunicacao_global());

drop policy if exists "data_sources: membro ou admin da agência vê" on data_sources;
create policy "data_sources: acesso por vínculo ou Comunicação" on data_sources
  for select using (public.has_ministry_access(ministry_id));

drop policy if exists "metrics: membro ou admin da agência vê" on metrics;
create policy "metrics: acesso por vínculo ou Comunicação" on metrics
  for select using (public.has_ministry_access(ministry_id));

-- de novo, só se a 0002 já tiver rodado nesse banco.
do $$
begin
  if to_regclass('public.asana_tasks') is not null then
    execute 'drop policy if exists "asana_tasks: membro ou admin da agência vê" on asana_tasks';
    execute 'create policy "asana_tasks: acesso por vínculo ou Comunicação" on asana_tasks '
      || 'for select using (public.has_ministry_access(ministry_id))';
  end if;
end $$;

-- Só Comunicação pode cadastrar/editar ministério e vínculos de acesso.
create policy "ministries: Comunicação edita" on ministries
  for insert with check (public.is_comunicacao_global());
create policy "ministries: Comunicação atualiza" on ministries
  for update using (public.is_comunicacao_global());
create policy "ministry_members: Comunicação gerencia vínculos" on ministry_members
  for all using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());

-- ---------------------------------------------------------
-- 11. Segurança: a policy "profiles: usuário edita o próprio
-- perfil" (0001) permite que qualquer usuário atualize a própria
-- linha inteira — sem essa trava, ele poderia se autopromover
-- alterando papel_global direto pelo client SDK. Só quem já é
-- Comunicação pode mudar esse campo em outra conta.
-- ---------------------------------------------------------
create or replace function public.prevent_self_privilege_escalation()
returns trigger as $$
begin
  if new.papel_global is distinct from old.papel_global and not public.is_comunicacao_global() then
    new.papel_global := old.papel_global;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_privilege_escalation on profiles;
create trigger trg_prevent_privilege_escalation
  before update on profiles
  for each row execute procedure public.prevent_self_privilege_escalation();
