-- =========================================================
-- Complementa a migration 0027: o filtro por semana no relatório de
-- performance da campanha precisa recalcular CTR/CPM/CPC de cada
-- semana selecionada, não só investido/vendas — pra isso, a linha
-- semanal precisa trazer impressões e cliques também (a API do Meta já
-- devolve isso no mesmo request; só faltava salvar).
-- =========================================================

alter table meta_ad_campaign_weekly add column if not exists impressoes integer;
alter table meta_ad_campaign_weekly add column if not exists cliques integer;
