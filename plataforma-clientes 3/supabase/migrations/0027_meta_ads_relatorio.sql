-- =========================================================
-- Amplia a integração com o Meta Ads (migration 0025) pra um relatório
-- de performance completo por campanha, no estilo do dashboard de
-- exemplo que o Eduardo mostrou (conferência de mulheres): investido x
-- vendas por semana, público por gênero/idade, e uma tabela por
-- criativo (anúncio) — não só o total da campanha.
--
-- `vendas` (conversões reais, ex: ingressos vendidos) vem do campo
-- `actions` da API de insights do Meta — só existe se o Pixel/
-- Conversions API estiver configurado no evento de compra do site. Se
-- não estiver, o sync grava null (não zero), e a tela mostra "não
-- disponível" em vez de um CPA errado.
-- =========================================================

alter table meta_ad_campaigns add column if not exists vendas integer;

-- ---------------------------------------------------------------
-- 1. meta_ads: uma linha por ANÚNCIO (criativo) do Meta, não por
-- campanha — é o que alimenta a "Tabela completa por criativo" do
-- exemplo. Liga em meta_ad_campaigns pelo meta_campaign_id (texto,
-- já é unique na 0025), não pela uuid interna, porque é a chave que o
-- script de sync já tem em mãos ao processar o insight de nível "ad".
-- ---------------------------------------------------------------
create table if not exists meta_ads (
  id uuid primary key default gen_random_uuid(),
  meta_ad_id text not null unique,
  meta_campaign_id text not null references meta_ad_campaigns (meta_campaign_id) on delete cascade,
  nome text not null,
  investimento numeric,
  impressoes integer,
  cliques integer,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  vendas integer,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists meta_ads_campaign_idx on meta_ads (meta_campaign_id);

-- ---------------------------------------------------------------
-- 2. meta_ad_campaign_weekly: investido x vendas por semana, por
-- campanha do Meta — alimenta o gráfico "Evolução Semanal". Uma linha
-- por semana devolvida pela API (time_increment=7).
-- ---------------------------------------------------------------
create table if not exists meta_ad_campaign_weekly (
  id uuid primary key default gen_random_uuid(),
  meta_campaign_id text not null references meta_ad_campaigns (meta_campaign_id) on delete cascade,
  semana_inicio date not null,
  semana_fim date not null,
  investimento numeric,
  vendas integer,
  synced_at timestamptz not null default now(),
  unique (meta_campaign_id, semana_inicio)
);

create index if not exists meta_ad_campaign_weekly_campaign_idx on meta_ad_campaign_weekly (meta_campaign_id);

-- ---------------------------------------------------------------
-- 3. meta_ad_campaign_demografia: investido x vendas por gênero OU por
-- faixa etária — uma tabela só, com `tipo` dizendo qual das duas
-- quebras aquela linha representa (evita duas tabelas quase idênticas
-- pra alimentar a pizza de gênero e a barra de idade do exemplo).
-- ---------------------------------------------------------------
create table if not exists meta_ad_campaign_demografia (
  id uuid primary key default gen_random_uuid(),
  meta_campaign_id text not null references meta_ad_campaigns (meta_campaign_id) on delete cascade,
  tipo text not null check (tipo in ('genero', 'idade')),
  chave text not null,
  investimento numeric,
  vendas integer,
  synced_at timestamptz not null default now(),
  unique (meta_campaign_id, tipo, chave)
);

create index if not exists meta_ad_campaign_demografia_campaign_idx on meta_ad_campaign_demografia (meta_campaign_id);

-- ---------------------------------------------------------------
-- 4. RLS: mesma regra de leitura das 3 tabelas novas — Comunicação vê
-- tudo; qualquer outro usuário só vê linhas de uma campanha do Meta já
-- vinculada a uma campanha/evento do portal que ele acessa (reaproveita
-- campaign_shared_with_accessible_ministry, migration 0018/0026). Não
-- precisa de política de escrita: quem grava é sempre o script de sync,
-- com a service role (passa direto pela RLS).
-- ---------------------------------------------------------------
alter table meta_ads enable row level security;
alter table meta_ad_campaign_weekly enable row level security;
alter table meta_ad_campaign_demografia enable row level security;

drop policy if exists "meta_ads: leitura via campanha vinculada" on meta_ads;
create policy "meta_ads: leitura via campanha vinculada"
  on meta_ads for select
  using (
    public.is_comunicacao_global()
    or exists (
      select 1 from meta_ad_campaigns mac
      where mac.meta_campaign_id = meta_ads.meta_campaign_id
        and mac.campaign_id is not null
        and public.campaign_shared_with_accessible_ministry(mac.campaign_id)
    )
  );

drop policy if exists "meta_ad_campaign_weekly: leitura via campanha vinculada" on meta_ad_campaign_weekly;
create policy "meta_ad_campaign_weekly: leitura via campanha vinculada"
  on meta_ad_campaign_weekly for select
  using (
    public.is_comunicacao_global()
    or exists (
      select 1 from meta_ad_campaigns mac
      where mac.meta_campaign_id = meta_ad_campaign_weekly.meta_campaign_id
        and mac.campaign_id is not null
        and public.campaign_shared_with_accessible_ministry(mac.campaign_id)
    )
  );

drop policy if exists "meta_ad_campaign_demografia: leitura via campanha vinculada" on meta_ad_campaign_demografia;
create policy "meta_ad_campaign_demografia: leitura via campanha vinculada"
  on meta_ad_campaign_demografia for select
  using (
    public.is_comunicacao_global()
    or exists (
      select 1 from meta_ad_campaigns mac
      where mac.meta_campaign_id = meta_ad_campaign_demografia.meta_campaign_id
        and mac.campaign_id is not null
        and public.campaign_shared_with_accessible_ministry(mac.campaign_id)
    )
  );
