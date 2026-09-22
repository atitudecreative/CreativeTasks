-- 0030 Historico de status + indices que faltavam
-- Versao enxuta, so o codigo. A versao comentada, que explica cada decisao,
-- esta em supabase/migrations/0030_historico_status_e_indices.sql
-- Pode rodar de uma vez. Se falhar por corte no meio, rode PARTE por PARTE.
-- Atencao: a PARTE 1 tem um corpo de funcao entre $$ e precisa ser colada
-- inteira, do "create or replace function" ate o "$$" final.


-- ===== PARTE 1 de 3: funcao de log de transicao =====

create or replace function public.log_mudanca_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campo text := tg_argv[0];
  anterior text;
  novo text;
begin
  anterior := to_jsonb(old) ->> campo;
  novo := to_jsonb(new) ->> campo;

  if anterior is distinct from novo then
    insert into audit_log (
      actor_id, acao, entidade_tipo, entidade_id, valor_anterior, valor_novo
    )
    values (
      auth.uid(),
      'mudanca_' || campo,
      tg_table_name,
      new.id,
      jsonb_build_object(campo, anterior),
      jsonb_build_object(campo, novo)
    );
  end if;

  return new;
end;
$$;


-- ===== PARTE 2 de 3: triggers =====

drop trigger if exists demands_log_status on demands;
create trigger demands_log_status
  after update of status on demands
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_mudanca_status('status');

drop trigger if exists campaigns_log_saude on campaigns;
create trigger campaigns_log_saude
  after update of saude on campaigns
  for each row
  when (old.saude is distinct from new.saude)
  execute function public.log_mudanca_status('saude');

drop trigger if exists campaigns_log_fase on campaigns;
create trigger campaigns_log_fase
  after update of fase on campaigns
  for each row
  when (old.fase is distinct from new.fase)
  execute function public.log_mudanca_status('fase');

drop trigger if exists deliverables_log_status on deliverables;
create trigger deliverables_log_status
  after update of status on deliverables
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_mudanca_status('status');

drop trigger if exists campaigns_log_publicada on campaigns;
create trigger campaigns_log_publicada
  after update of publicada on campaigns
  for each row
  when (old.publicada is distinct from new.publicada)
  execute function public.log_mudanca_status('publicada');


-- ===== PARTE 3 de 3: indices =====

create index if not exists audit_log_entidade_tempo_idx
  on audit_log (entidade_tipo, entidade_id, created_at);

create index if not exists audit_log_created_idx
  on audit_log (created_at desc);

create index if not exists campaign_ministries_ministry_idx
  on campaign_ministries (ministry_id);

create index if not exists deliverables_campaign_idx
  on deliverables (campaign_id);

create index if not exists deliverables_demand_idx
  on deliverables (demand_id);
