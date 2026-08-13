-- =========================================================
-- Índices que faltavam pras consultas mais comuns do app —
-- sem eles o Postgres varre a tabela inteira em vez de usar
-- um índice, e isso pesa conforme os dados crescem. Nenhuma
-- mudança de comportamento, só deixa as mesmas consultas
-- rápidas.
-- =========================================================

-- getUserMemberships() roda em praticamente toda navegação (ver
-- src/lib/data/ministries.ts) e filtra por user_id — mas a chave
-- primária de ministry_members é (ministry_id, user_id), então sem
-- esse índice o Postgres não consegue buscar direto por user_id.
create index if not exists ministry_members_user_idx on ministry_members (user_id);

-- getDemandsForMinistry() filtra por ministry_id + prazo_acordado (>=
-- corte de 2026) e ordena por prazo_acordado — é a query por trás das
-- páginas Início e Demandas.
create index if not exists demands_ministry_prazo_idx on demands (ministry_id, prazo_acordado);

-- getMilestonesForCampaign() filtra por campaign_id.
create index if not exists milestones_campaign_idx on milestones (campaign_id);
