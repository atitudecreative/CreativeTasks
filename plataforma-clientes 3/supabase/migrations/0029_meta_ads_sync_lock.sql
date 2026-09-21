-- =========================================================
-- Mesma trava manual criada em 0020_sync_lock.sql pro sync do Asana,
-- agora também pro sync do Meta Ads: o script rodava sem nenhuma trava,
-- então duas rodadas sobrepostas (cron duplicado, ou uma rodada manual
-- em cima de uma agendada) podiam brigar pelo mesmo upsert em
-- meta_ad_campaigns/meta_ads/meta_ad_campaign_weekly/
-- meta_ad_campaign_demografia ao mesmo tempo.
-- =========================================================
insert into sync_lock (id, locked)
values ('meta-ads', false)
on conflict (id) do nothing;
