-- 0032 View de perfil de campanha (base da camada de comparacao)
-- Versao enxuta, so o codigo. A versao comentada, que explica cada decisao,
-- esta em supabase/migrations/0032_perfil_campanha.sql
-- Sao apenas dois comandos. Se falhar por corte no meio, rode PARTE por PARTE.


-- ===== PARTE 1 de 2: a view =====

create or replace view public.campanha_perfil
with (security_invoker = true)
as
with
midia as (
  select
    mac.campaign_id,
    sum(mac.investimento) as investimento_midia,
    sum(mac.alcance)      as alcance,
    sum(mac.impressoes)   as impressoes,
    sum(mac.cliques)      as cliques,
    case when count(mac.vendas) > 0 then sum(mac.vendas) end as vendas
  from meta_ad_campaigns mac
  where mac.campaign_id is not null
  group by mac.campaign_id
),
demandas as (
  select
    dc.campaign_id,
    count(*) as demandas_total,
    count(*) filter (where d.status = 'concluida') as demandas_concluidas,
    count(*) filter (
      where d.data_conclusao is not null and d.prazo_acordado is not null
    ) as demandas_com_prazo_aferivel,
    count(*) filter (
      where d.data_conclusao is not null
        and d.prazo_acordado is not null
        and d.data_conclusao <= d.prazo_acordado
    ) as demandas_no_prazo,
    percentile_cont(0.5) within group (
      order by (d.data_conclusao - d.data_solicitacao)
    ) filter (
      where d.data_conclusao is not null
        and d.data_solicitacao is not null
        and d.data_conclusao >= d.data_solicitacao
    ) as ciclo_mediano_dias
  from demand_campaigns dc
  join demands d on d.id = dc.demand_id
  group by dc.campaign_id
),
entregas as (
  select campaign_id, count(*) as entregas_total
  from deliverables
  where campaign_id is not null
  group by campaign_id
),
marcos as (
  select
    campaign_id,
    sum(peso) as peso_total,
    sum(peso) filter (where concluido) as peso_concluido
  from milestones
  group by campaign_id
)
select
  c.id,
  c.ministry_id,
  c.nome,
  c.tipo,
  c.fase,
  c.saude,
  c.publicada,
  c.data_inicio,
  c.data_termino,
  c.data_evento,
  coalesce(c.data_evento, c.data_termino, c.data_inicio) as data_referencia,
  c.orcamento_planejado,
  c.orcamento_aprovado,
  coalesce(m.investimento_midia, c.investimento_realizado) as investimento,
  m.investimento_midia,
  c.investimento_realizado as investimento_manual,
  m.alcance,
  m.impressoes,
  m.cliques,
  m.vendas,
  case when m.impressoes > 0
    then (m.cliques::numeric / nullif(m.impressoes, 0)) * 100 end     as ctr,
  case when m.cliques > 0
    then m.investimento_midia / nullif(m.cliques, 0) end              as cpc,
  case when m.impressoes > 0
    then (m.investimento_midia / nullif(m.impressoes, 0)) * 1000 end  as cpm,
  case when m.vendas > 0
    then m.investimento_midia / nullif(m.vendas, 0) end               as cpa,
  case when m.alcance > 0
    then m.impressoes::numeric / nullif(m.alcance, 0) end             as frequencia,
  coalesce(d.demandas_total, 0)              as demandas_total,
  coalesce(d.demandas_concluidas, 0)         as demandas_concluidas,
  coalesce(d.demandas_com_prazo_aferivel, 0) as demandas_com_prazo_aferivel,
  coalesce(d.demandas_no_prazo, 0)           as demandas_no_prazo,
  d.ciclo_mediano_dias,
  coalesce(e.entregas_total, 0)              as entregas_total,
  case when mk.peso_total > 0
    then round((mk.peso_concluido / mk.peso_total) * 100) end as progresso_marcos
from campaigns c
left join midia    m  on m.campaign_id  = c.id
left join demandas d  on d.campaign_id  = c.id
left join entregas e  on e.campaign_id  = c.id
left join marcos   mk on mk.campaign_id = c.id;


-- ===== PARTE 2 de 2: descricao da view =====

comment on view public.campanha_perfil is
  'Uma linha por campanha com métricas de mídia, demandas, entregas e marcos '
  'já agregadas. Base da camada de comparação e benchmark. Roda com as '
  'permissões de quem consulta (security_invoker), então cada ministério '
  'compara contra o próprio histórico e a Comunicação contra a carteira toda.';
