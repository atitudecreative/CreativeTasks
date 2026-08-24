-- =========================================================
-- Integração com o Meta Marketing API: cada linha é UMA campanha de
-- anúncios trazida da conta do Meta (via scripts/sync-meta-ads.mjs),
-- com as métricas reais de alcance/impressões/cliques/investimento.
--
-- `campaign_id` liga essa campanha do Meta a uma campanha/evento do
-- portal — o sync tenta casar automaticamente por NOME (mesma ideia já
-- usada pra tag do Asana → campanha: trim + minúsculo), e quando não
-- bate (nome diferente entre o time de tráfego e o de conteúdo), fica
-- null até alguém vincular manualmente em
-- /dashboard/admin/campanhas-pendentes. `matched_manualmente` marca esse
-- caso pra o sync NUNCA sobrescrever um vínculo manual numa rodada
-- futura, mesmo que o nome mude de um lado.
-- =========================================================
create table if not exists meta_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  meta_campaign_id text not null unique,
  meta_ad_account_id text not null,
  nome text not null,
  status text,
  campaign_id uuid references campaigns(id) on delete set null,
  matched_manualmente boolean not null default false,
  alcance integer,
  impressoes integer,
  cliques integer,
  investimento numeric,
  data_inicio date,
  data_termino date,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists meta_ad_campaigns_campaign_id_idx on meta_ad_campaigns (campaign_id);

alter table meta_ad_campaigns enable row level security;

-- Leitura: Comunicação vê tudo (inclusive não vinculadas, pra resolver o
-- vínculo manual); qualquer outro usuário só vê métricas de campanhas do
-- Meta já casadas com uma campanha/evento que ele tenha acesso (mesma
-- função SECURITY DEFINER já usada pra "demanda vem de campanha
-- compartilhada", migration 0018 — evita reescrever/duplicar o join e
-- evita recursão de RLS).
drop policy if exists "meta_ad_campaigns: leitura via campanha vinculada" on meta_ad_campaigns;
create policy "meta_ad_campaigns: leitura via campanha vinculada"
  on meta_ad_campaigns for select
  using (
    public.is_comunicacao_global()
    or (campaign_id is not null and public.campaign_shared_with_accessible_ministry(campaign_id))
  );

-- Vincular/desvincular manualmente: só Comunicação (mesmo grupo que já
-- edita campanha em Campanhas ativas). Inserção/atualização de métricas
-- em si é feita pelo script de sync, que usa a service role e passa
-- direto pela RLS.
drop policy if exists "meta_ad_campaigns: Comunicação vincula" on meta_ad_campaigns;
create policy "meta_ad_campaigns: Comunicação vincula"
  on meta_ad_campaigns for update
  using (public.is_comunicacao_global())
  with check (public.is_comunicacao_global());
