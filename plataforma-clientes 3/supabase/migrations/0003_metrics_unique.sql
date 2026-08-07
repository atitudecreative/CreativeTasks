-- Permite que os scripts de sincronização façam upsert em metrics
-- (rodar o sync várias vezes no mesmo dia atualiza a linha do dia,
-- em vez de duplicar).
alter table metrics
  add constraint metrics_org_source_key_period_uidx
  unique (organization_id, source, metric_key, period_date);
