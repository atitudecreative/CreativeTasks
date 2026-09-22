-- 0031 De-para configuravel: coluna do quadro do Asana -> status do portal
-- Versao enxuta, so o codigo. A versao comentada, que explica cada decisao,
-- esta em supabase/migrations/0031_asana_de_para_status.sql
-- Pode rodar de uma vez. Se falhar por corte no meio, rode PARTE por PARTE.


-- ===== PARTE 1 de 4: normalizacao de nome de coluna =====

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
  )
$$;


-- ===== PARTE 2 de 4: tabelas =====

create table if not exists asana_secoes (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references ministries (id) on delete cascade,
  secao text not null,
  secao_normalizada text not null,
  total_tarefas integer not null default 0,
  vista_em timestamptz not null default now(),
  unique (ministry_id, secao_normalizada)
);

create index if not exists asana_secoes_ministry_idx
  on asana_secoes (ministry_id);

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

create unique index if not exists asana_status_map_global_uidx
  on asana_status_map (secao_normalizada)
  where ministry_id is null;

create unique index if not exists asana_status_map_ministerio_uidx
  on asana_status_map (ministry_id, secao_normalizada)
  where ministry_id is not null;


-- ===== PARTE 3 de 4: regras globais iniciais =====

insert into asana_status_map (ministry_id, secao_normalizada, status)
select null, nome, status
from (values
  (array['backlog','novas','entrada','solicitacoes']::text[], 'recebida'::text),
  (array['triagem'], 'em_triagem'),
  (array['briefing','aguardando briefing'], 'aguardando_briefing'),
  (array['a fazer','planejamento','planejadas'], 'planejada'),
  (array['fazendo','em andamento','em producao','producao','em arte','criacao'], 'em_producao'),
  (array['revisao','revisao interna','em revisao'], 'em_revisao_interna'),
  (array['com o cliente','com o ministerio','aguardando cliente','aguardando ministerio'], 'aguardando_ministerio'),
  (array['aguardando aprovacao','para aprovacao','aprovacao'], 'aguardando_aprovacao'),
  (array['ajustes','ajustes solicitados','correcoes'], 'ajustes_solicitados'),
  (array['aprovado','aprovadas'], 'aprovada'),
  (array['agendado','publicado','no ar'], 'agendada_ou_publicada'),
  (array['feito','concluido','concluidas','finalizado','entregue'], 'concluida'),
  (array['pausado','em espera','standby'], 'pausada'),
  (array['cancelado','canceladas'], 'cancelada')
) as t(nomes, status), unnest(t.nomes) as nome
on conflict do nothing;


-- ===== PARTE 4 de 4: RLS =====

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
