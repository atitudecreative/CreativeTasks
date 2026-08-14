-- =========================================================
-- Tags/campanhas viram GLOBAIS: até aqui, uma tag do Asana virava
-- uma campanha por ministério (cada projeto do Asana sincronizava
-- pra sua própria linha em `campaigns`), então a mesma tag em dois
-- ministérios diferentes (ex: "mordomos" no projeto do Atendimento e
-- no do Pr. Josué Valandro) virava DUAS campanhas separadas, cada
-- uma só contando as demandas do seu próprio ministério.
--
-- A partir daqui: uma tag = uma campanha só, não importa em quantos
-- ministérios ela apareça. Todo ministério que tiver ao menos uma
-- demanda com aquela tag passa a ver a campanha inteira — inclusive
-- as demandas que vieram de OUTRO ministério. `campaigns.ministry_id`
-- continua existindo só como "ministério de origem" (o primeiro que
-- criou aquela tag), sem mais controlar quem enxerga o quê.
-- =========================================================

-- ---------------------------------------------------------------
-- 1. campaigns.ministry_id vira opcional (era o dono; agora é só
-- informativo) — e o delete de ministério deixa a campanha órfã em
-- vez de apagar ela (uma campanha compartilhada não pode sumir só
-- porque UM dos ministérios que a usa foi excluído).
-- ---------------------------------------------------------------
alter table campaigns
  alter column ministry_id drop not null;

alter table campaigns
  drop constraint if exists campaigns_ministry_id_fkey;

alter table campaigns
  add constraint campaigns_ministry_id_fkey
    foreign key (ministry_id) references ministries (id) on delete set null;

-- ---------------------------------------------------------------
-- 2. campaign_folders também vira global — pasta deixa de pertencer a
-- um ministério (não faz mais sentido, já que as campanhas dentro dela
-- podem vir de vários). Pastas antigas mantêm o ministry_id que já
-- tinham (histórico, sem efeito prático); pastas novas nascem sem.
-- ---------------------------------------------------------------
alter table campaign_folders
  alter column ministry_id drop not null;

-- ---------------------------------------------------------------
-- 3. RLS: visibilidade cruzada entre ministérios quando compartilham
-- uma campanha publicada.
-- ---------------------------------------------------------------

-- campaigns: além do vínculo com o ministério de origem, também
-- visível pra quem tem acesso a QUALQUER ministério com demanda
-- vinculada a essa campanha.
drop policy if exists "campaigns: acesso por ministério" on campaigns;
drop policy if exists "campaigns: acesso por origem ou por demanda vinculada" on campaigns;
create policy "campaigns: acesso por origem ou por demanda vinculada" on campaigns
  for select using (
    (ministry_id is not null and public.has_ministry_access(ministry_id))
    or exists (
      select 1
      from demand_campaigns dc
      join demands d on d.id = dc.demand_id
      where dc.campaign_id = campaigns.id
        and public.has_ministry_access(d.ministry_id)
    )
  );

-- demands: além do próprio ministério, também visível se a demanda
-- divide uma campanha PUBLICADA com alguma demanda de um ministério
-- que o usuário acessa (é isso que faz o card da campanha mostrar as
-- demandas de todos os ministérios envolvidos, não só o seu).
drop policy if exists "demands: visível via campanha compartilhada" on demands;
drop policy if exists "demands: acesso por ministério" on demands;
create policy "demands: acesso por ministério" on demands
  for select using (public.has_ministry_access(ministry_id));

create policy "demands: visível via campanha compartilhada" on demands
  for select using (
    exists (
      select 1
      from demand_campaigns dc
      join demand_campaigns dc2 on dc2.campaign_id = dc.campaign_id
      join demands d2 on d2.id = dc2.demand_id
      join campaigns c on c.id = dc.campaign_id
      where dc.demand_id = demands.id
        and c.publicada = true
        and public.has_ministry_access(d2.ministry_id)
    )
  );

-- demand_campaigns: idem — o vínculo (linha da tabela de junção) fica
-- visível não só quando a demanda diretamente ligada é sua, mas também
-- quando a campanha é compartilhada com um ministério seu.
drop policy if exists "demand_campaigns: acesso por ministério" on demand_campaigns;
drop policy if exists "demand_campaigns: acesso por ministério ou campanha compartilhada" on demand_campaigns;
create policy "demand_campaigns: acesso por ministério ou campanha compartilhada" on demand_campaigns
  for select using (
    exists (
      select 1 from demands d
      where d.id = demand_campaigns.demand_id
        and public.has_ministry_access(d.ministry_id)
    )
    or exists (
      select 1
      from demand_campaigns dc2
      join demands d2 on d2.id = dc2.demand_id
      join campaigns c on c.id = demand_campaigns.campaign_id
      where dc2.campaign_id = demand_campaigns.campaign_id
        and public.has_ministry_access(d2.ministry_id)
        and c.publicada = true
    )
  );

-- milestones (marcos): mesma lógica — visível também pra ministério
-- que compartilha a campanha via demanda vinculada.
drop policy if exists "milestones: acesso por ministério" on milestones;
drop policy if exists "milestones: acesso por ministério ou campanha compartilhada" on milestones;
create policy "milestones: acesso por ministério ou campanha compartilhada" on milestones
  for select using (
    exists (select 1 from campaigns c where c.id = milestones.campaign_id and public.has_ministry_access(c.ministry_id))
    or exists (
      select 1
      from demand_campaigns dc
      join demands d on d.id = dc.demand_id
      where dc.campaign_id = milestones.campaign_id
        and public.has_ministry_access(d.ministry_id)
    )
  );

-- campaign_folders: leitura por Comunicação (vê tudo) ou por vínculo
-- direto com o ministério de origem, quando ainda existe um (pastas
-- antigas). Escrita sempre só Comunicação global — pasta é uma
-- ferramenta de organização administrativa, sem "dono" por ministério.
drop policy if exists "campaign_folders: acesso por vínculo ou Comunicação" on campaign_folders;
drop policy if exists "campaign_folders: leitura" on campaign_folders;
create policy "campaign_folders: leitura" on campaign_folders
  for select using (
    public.is_comunicacao_global()
    or (ministry_id is not null and public.has_ministry_access(ministry_id))
  );

drop policy if exists "campaign_folders: Comunicação gerencia" on campaign_folders;
drop policy if exists "campaign_folders: só Comunicação gerencia" on campaign_folders;
create policy "campaign_folders: só Comunicação gerencia" on campaign_folders
  for all using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());

-- ---------------------------------------------------------------
-- 4. Conserta o estrago que o modelo antigo já causou: funde
-- campanhas duplicadas (mesmo nome, ignorando maiúsc/minúsc e
-- espaços) que existem hoje só porque a mesma tag apareceu em mais
-- de um ministério. Fica uma linha por nome — a mais antiga — e tudo
-- que apontava pras duplicatas (demand_campaigns, demands.campaign_id,
-- deliverables.campaign_id, milestones.campaign_id) é repontado pra
-- ela antes das duplicatas serem apagadas.
--
-- Tudo dentro de um único bloco DO: uma tabela temporária só é
-- confiável entre vários comandos se todos rodarem na MESMA sessão —
-- e o SQL Editor do Supabase nem sempre garante isso quando o script
-- tem várias instruções separadas por ";" (foi o que deu
-- "relation campaign_canonical does not exist" da primeira vez). Um
-- bloco DO é uma instrução só, executada de uma vez, então a tabela
-- temporária criada dentro dele nunca "some" no meio do caminho.
-- ---------------------------------------------------------------
do $$
begin
  create temporary table campaign_canonical on commit drop as
  select
    c.id,
    first_value(c.id) over (
      partition by lower(trim(c.nome))
      order by c.created_at asc, c.id asc
    ) as canonical_id
  from campaigns c;

  -- remove vínculo duplicado que colidiria com a PK (demand_id, campaign_id)
  -- ao repontar pra canônica (caso a mesma demanda já estivesse ligada às duas)
  delete from demand_campaigns dc
  using campaign_canonical cc
  where dc.campaign_id = cc.id
    and cc.id <> cc.canonical_id
    and exists (
      select 1 from demand_campaigns dc2
      where dc2.demand_id = dc.demand_id
        and dc2.campaign_id = cc.canonical_id
    );

  update demand_campaigns dc
  set campaign_id = cc.canonical_id
  from campaign_canonical cc
  where dc.campaign_id = cc.id
    and cc.id <> cc.canonical_id;

  update demands d
  set campaign_id = cc.canonical_id
  from campaign_canonical cc
  where d.campaign_id = cc.id
    and cc.id <> cc.canonical_id;

  update deliverables dl
  set campaign_id = cc.canonical_id
  from campaign_canonical cc
  where dl.campaign_id = cc.id
    and cc.id <> cc.canonical_id;

  update milestones m
  set campaign_id = cc.canonical_id
  from campaign_canonical cc
  where m.campaign_id = cc.id
    and cc.id <> cc.canonical_id;

  -- se alguma duplicata já estava publicada (visível), garante que a
  -- que sobrevive também fique — não esconde algo que já era visível
  update campaigns c
  set publicada = true
  where c.id in (select canonical_id from campaign_canonical)
    and exists (
      select 1 from campaigns dup
      join campaign_canonical cc on cc.id = dup.id
      where cc.canonical_id = c.id and dup.publicada = true
    );

  delete from campaigns c
  using campaign_canonical cc
  where c.id = cc.id
    and cc.id <> cc.canonical_id;

  drop table campaign_canonical;
end $$;
