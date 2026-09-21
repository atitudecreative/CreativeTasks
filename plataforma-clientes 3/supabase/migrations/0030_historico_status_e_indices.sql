-- =========================================================================
-- 0030 — Histórico de status + índices que faltavam
-- =========================================================================
-- Aditiva e segura de rodar mais de uma vez. Não altera nenhuma coluna
-- existente, não apaga nada, não muda regra de negócio.
--
-- CONTEXTO
-- A tabela `audit_log` foi criada na migration 0004 e nunca recebeu uma
-- linha sequer — nenhum ponto do código escreve nela. Com isso, a
-- plataforma guarda apenas o ESTADO ATUAL de cada demanda, campanha e
-- entrega, e não o caminho até ele.
--
-- Isso impede responder perguntas que são o dia a dia de uma agência:
--   - Quanto tempo uma demanda fica em cada etapa?
--   - Onde está o gargalo do fluxo?
--   - Quantas demandas voltaram para ajuste (retrabalho)?
--   - Quanto tempo uma entrega espera aprovação do ministério?
--
-- Nenhuma dessas é calculável a partir de uma coluna `status` que só
-- guarda o valor de agora. Registrar a TRANSIÇÃO resolve todas de uma vez.
--
-- POR QUE UM TRIGGER, E NÃO CÓDIGO NA APLICAÇÃO
-- O status é escrito de três lugares: server actions do portal, o
-- `sync-asana.mjs` (service role, fora do Next) e eventualmente o SQL
-- Editor do Supabase. Um trigger no banco é o único ponto por onde os
-- três passam — em qualquer outro lugar o histórico ficaria com furos.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. Função de log de transição
-- -------------------------------------------------------------------------
-- Grava SOMENTE quando o valor realmente muda (`is distinct from`, que
-- trata null corretamente). Isso importa muito aqui: o sync do Asana faz
-- upsert de TODAS as demandas a cada rodada, então sem essa checagem o
-- audit_log ganharia milhares de linhas idênticas por dia.
--
-- `auth.uid()` vem null quando quem escreve é a service role (o sync) —
-- e isso é informação, não defeito: distingue mudança feita por pessoa
-- de mudança vinda da automação.
--
-- SECURITY DEFINER para o insert não depender das policies de quem
-- disparou a escrita.
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
  -- to_jsonb(old) ->> campo em vez de EXECUTE com SQL montado em string:
  -- lê o campo pelo nome sem nenhum SQL dinâmico, então não há
  -- superfície de injeção mesmo o nome do campo vindo de tg_argv, e não
  -- há custo de planejar uma query a cada disparo.
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


-- -------------------------------------------------------------------------
-- 2. Triggers
-- -------------------------------------------------------------------------
-- `when (old.x is distinct from new.x)` faz o filtro já no nível do
-- trigger: em update que não mexe no campo, a função nem chega a ser
-- chamada. É o que mantém o custo do sync praticamente inalterado.

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

-- Publicar/ocultar campanha é decisão editorial da Comunicação e uma das
-- poucas ações do portal com efeito direto no que o cliente enxerga —
-- vale ter registro de quem virou a chave e quando.
drop trigger if exists campaigns_log_publicada on campaigns;
create trigger campaigns_log_publicada
  after update of publicada on campaigns
  for each row
  when (old.publicada is distinct from new.publicada)
  execute function public.log_mudanca_status('publicada');


-- -------------------------------------------------------------------------
-- 3. Índice para leitura do histórico
-- -------------------------------------------------------------------------
-- `audit_log_entidade_idx (entidade_tipo, entidade_id)` já existe (0004).
-- Falta o acesso por tempo, que é como a linha do tempo de uma entidade e
-- o cálculo de tempo por etapa vão ler.
create index if not exists audit_log_entidade_tempo_idx
  on audit_log (entidade_tipo, entidade_id, created_at);

create index if not exists audit_log_created_idx
  on audit_log (created_at desc);


-- -------------------------------------------------------------------------
-- 4. Índices que faltavam
-- -------------------------------------------------------------------------
-- A cobertura de índice do projeto é boa (20 índices espalhados por 11
-- migrations). Estes três são os que sobraram, e os três estão em
-- caminho quente.

-- campaign_ministries tem PK (campaign_id, ministry_id), então a busca
-- por ministry_id — que é exatamente o que getCampaignsForMinistry faz a
-- cada carregamento de página — não usa índice nenhum.
create index if not exists campaign_ministries_ministry_idx
  on campaign_ministries (ministry_id);

-- deliverables tem índice por (ministry_id, status), mas o relatório de
-- campanha e o detalhe da demanda buscam por campaign_id e demand_id.
create index if not exists deliverables_campaign_idx
  on deliverables (campaign_id);

create index if not exists deliverables_demand_idx
  on deliverables (demand_id);
