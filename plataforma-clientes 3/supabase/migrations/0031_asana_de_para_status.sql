-- =========================================================================
-- 0031 — De-para configurável: coluna do quadro do Asana -> status do portal
-- =========================================================================
-- Aditiva. Não altera coluna existente, não apaga nada, não muda policy
-- de tabela que já existia.
--
-- O PROBLEMA
-- O sync do Asana resolvia o status assim (sync-asana.mjs:413):
--
--     status: task.completed ? "concluida" : "em_producao"
--
-- A plataforma modela 14 status, o banco aceita os 14, a interface
-- desenha os 14 — e os dados tinham DOIS. Na prática:
--   - "Com o ministério" (aguardando_ministerio / aguardando_aprovacao /
--     ajustes_solicitados), que é a leitura mais acionável do painel,
--     nunca acontecia;
--   - qualquer status ajustado à mão voltava pra em_producao na rodada
--     seguinte, porque o sync faz upsert de tudo.
--
-- O dado real sempre esteve no Asana: a COLUNA do quadro onde o card
-- está. O script simplesmente não pedia esse campo.
--
-- A SOLUÇÃO
-- Duas tabelas. Uma que o sync PREENCHE sozinho com as colunas que
-- encontrou, e outra onde a Comunicação diz o que cada coluna significa.
-- Assim o de-para não exige deploy e não exige que ninguém digite nome
-- de coluna de cabeça: a tela oferece o que existe de verdade nos quadros.
-- =========================================================================


-- -------------------------------------------------------------------------
-- Normalização de nome de coluna
-- -------------------------------------------------------------------------
-- "Em Arte", "em arte" e "Em arte " precisam casar com a mesma regra.
-- Feito com translate() em vez da extensão unaccent de propósito: não
-- depende de extensão habilitada no projeto Supabase.
create or replace function public.normaliza_secao(texto text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      lower(
        translate(
          coalesce(texto, ''),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        )
      )
    ),
    ''
  );
$$;


-- -------------------------------------------------------------------------
-- 1. Catálogo de colunas vistas pelo sync
-- -------------------------------------------------------------------------
-- Preenchida automaticamente a cada rodada. Serve pra tela de
-- configuração listar as colunas REAIS de cada quadro, com quantas
-- tarefas tem em cada uma — em vez de pedir que alguém acerte o nome
-- digitando.
create table if not exists asana_secoes (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references ministries (id) on delete cascade,
  -- Nome como veio do Asana, preservado pra exibir do jeito que a pessoa
  -- vê no quadro dela.
  secao text not null,
  secao_normalizada text not null,
  total_tarefas integer not null default 0,
  vista_em timestamptz not null default now(),
  unique (ministry_id, secao_normalizada)
);

create index if not exists asana_secoes_ministry_idx
  on asana_secoes (ministry_id);


-- -------------------------------------------------------------------------
-- 2. O de-para
-- -------------------------------------------------------------------------
-- ministry_id null = regra GLOBAL, vale pra todo quadro que tenha uma
-- coluna com esse nome. Com ministry_id = regra só daquele ministério,
-- e ela vence a global.
--
-- Isso cobre o caso real: a maioria dos quadros segue o mesmo padrão
-- (uma regra global resolve), e um ou outro ministério tem um fluxo
-- próprio (uma exceção resolve, sem duplicar o resto).
create table if not exists asana_status_map (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid references ministries (id) on delete cascade,
  secao_normalizada text not null,
  status text not null check (status in (
    'recebida', 'em_triagem', 'aguardando_briefing', 'planejada',
    'em_producao', 'em_revisao_interna', 'aguardando_ministerio',
    'aguardando_aprovacao', 'ajustes_solicitados', 'aprovada',
    'agendada_ou_publicada', 'concluida', 'pausada', 'cancelada'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dois índices únicos parciais em vez de um unique(ministry_id, secao):
-- em Postgres, null nunca é igual a null, então um unique comum deixaria
-- cadastrar a MESMA regra global várias vezes.
create unique index if not exists asana_status_map_global_uidx
  on asana_status_map (secao_normalizada)
  where ministry_id is null;

create unique index if not exists asana_status_map_ministerio_uidx
  on asana_status_map (ministry_id, secao_normalizada)
  where ministry_id is not null;


-- -------------------------------------------------------------------------
-- 3. Regras globais iniciais
-- -------------------------------------------------------------------------
-- Cobre os nomes de coluna mais comuns em quadro de agência em português.
-- Não é adivinhação sobre ESTE cliente: é um ponto de partida pra tela
-- não nascer vazia. Tudo aqui é editável e apagável pela interface, e a
-- coluna que não casar com nenhuma regra continua caindo no
-- comportamento antigo (completed ? concluida : em_producao).
--
-- `on conflict do nothing` pra rodar a migration de novo não sobrescrever
-- ajuste que a Comunicação já tenha feito.
insert into asana_status_map (ministry_id, secao_normalizada, status)
values
  (null, 'a fazer',                'planejada'),
  (null, 'backlog',                'recebida'),
  (null, 'novas',                  'recebida'),
  (null, 'entrada',                'recebida'),
  (null, 'solicitacoes',           'recebida'),
  (null, 'triagem',                'em_triagem'),
  (null, 'briefing',               'aguardando_briefing'),
  (null, 'aguardando briefing',    'aguardando_briefing'),
  (null, 'planejamento',           'planejada'),
  (null, 'planejadas',             'planejada'),
  (null, 'fazendo',                'em_producao'),
  (null, 'em andamento',           'em_producao'),
  (null, 'em producao',            'em_producao'),
  (null, 'producao',               'em_producao'),
  (null, 'em arte',                'em_producao'),
  (null, 'criacao',                'em_producao'),
  (null, 'revisao',                'em_revisao_interna'),
  (null, 'revisao interna',        'em_revisao_interna'),
  (null, 'em revisao',             'em_revisao_interna'),
  (null, 'com o cliente',          'aguardando_ministerio'),
  (null, 'com o ministerio',       'aguardando_ministerio'),
  (null, 'aguardando cliente',     'aguardando_ministerio'),
  (null, 'aguardando ministerio',  'aguardando_ministerio'),
  (null, 'aguardando aprovacao',   'aguardando_aprovacao'),
  (null, 'para aprovacao',         'aguardando_aprovacao'),
  (null, 'aprovacao',              'aguardando_aprovacao'),
  (null, 'ajustes',                'ajustes_solicitados'),
  (null, 'ajustes solicitados',    'ajustes_solicitados'),
  (null, 'correcoes',              'ajustes_solicitados'),
  (null, 'aprovado',               'aprovada'),
  (null, 'aprovadas',              'aprovada'),
  (null, 'agendado',               'agendada_ou_publicada'),
  (null, 'publicado',              'agendada_ou_publicada'),
  (null, 'no ar',                  'agendada_ou_publicada'),
  (null, 'feito',                  'concluida'),
  (null, 'concluido',              'concluida'),
  (null, 'concluidas',             'concluida'),
  (null, 'finalizado',             'concluida'),
  (null, 'entregue',               'concluida'),
  (null, 'pausado',                'pausada'),
  (null, 'em espera',              'pausada'),
  (null, 'standby',                'pausada'),
  (null, 'cancelado',              'cancelada'),
  (null, 'canceladas',             'cancelada')
on conflict do nothing;


-- -------------------------------------------------------------------------
-- 4. RLS
-- -------------------------------------------------------------------------
-- Configuração de integração é assunto da Comunicação. O sync escreve com
-- service role, então não passa por policy nenhuma.
alter table asana_secoes enable row level security;
alter table asana_status_map enable row level security;

drop policy if exists "asana_secoes: só Comunicação" on asana_secoes;
create policy "asana_secoes: só Comunicação" on asana_secoes
  for all using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());

drop policy if exists "asana_status_map: só Comunicação" on asana_status_map;
create policy "asana_status_map: só Comunicação" on asana_status_map
  for all using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());
