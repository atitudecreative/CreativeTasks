-- =========================================================================
-- 0032 — View de perfil de campanha (base da camada de comparação)
-- =========================================================================
-- Aditiva: cria uma view. Não altera tabela, não apaga nada.
--
-- POR QUE UMA VIEW E NÃO CÁLCULO EM JAVASCRIPT
-- Toda agregação da plataforma até aqui acontece no Node: carrega a lista
-- inteira e soma num .reduce(). Funciona no volume de hoje e é o teto de
-- escala do produto — e para COMPARAR campanhas seria pior ainda, porque
-- exigiria carregar todas as campanhas, todas as métricas de mídia, todas
-- as demandas e todas as entregas de uma vez, a cada abertura de tela.
--
-- A view resolve isso no banco, que é onde índice e agregação existem, e
-- devolve uma linha por campanha com tudo que a comparação precisa.
--
-- SEGURANÇA
-- `security_invoker = true` faz a view rodar com as permissões de QUEM
-- CONSULTA, não de quem a criou. Isso é essencial: sem esse ajuste, uma
-- view sobre tabelas com RLS vaza dado de todos os ministérios pra
-- qualquer usuário logado.
--
-- Efeito colateral desejado: um ministério só compara contra o próprio
-- histórico (é o que o RLS dele deixa ver), enquanto a Comunicação
-- compara contra a carteira inteira. É o comportamento certo nos dois
-- casos, e sai de graça.
-- =========================================================================

create or replace view public.campanha_perfil
with (security_invoker = true)
as
with
-- Métricas de mídia paga somadas por campanha do portal. Uma campanha do
-- portal pode estar ligada a mais de uma campanha do Meta.
midia as (
  select
    mac.campaign_id,
    sum(mac.investimento)          as investimento_midia,
    sum(mac.alcance)               as alcance,
    sum(mac.impressoes)            as impressoes,
    sum(mac.cliques)               as cliques,
    -- `vendas` null quer dizer "sem rastreamento configurado", que é
    -- diferente de zero venda. count(mac.vendas) conta só as não nulas:
    -- se nenhuma campanha do Meta tiver rastreamento, o total fica null
    -- em vez de virar 0 e mentir que não houve resultado.
    case when count(mac.vendas) > 0 then sum(mac.vendas) end as vendas
  from meta_ad_campaigns mac
  where mac.campaign_id is not null
  group by mac.campaign_id
),

-- Demandas por campanha, com o recorte de prazo que interessa pra
-- pontualidade: só conta como "no prazo" quem tem as duas datas.
demandas as (
  select
    dc.campaign_id,
    count(*)                                                      as demandas_total,
    count(*) filter (where d.status = 'concluida')                as demandas_concluidas,
    count(*) filter (
      where d.data_conclusao is not null and d.prazo_acordado is not null
    )                                                             as demandas_com_prazo_aferivel,
    count(*) filter (
      where d.data_conclusao is not null
        and d.prazo_acordado is not null
        and d.data_conclusao <= d.prazo_acordado
    )                                                             as demandas_no_prazo,
    -- Tempo de ciclo mediano em dias. Só existe depois que o sync passou
    -- a gravar data_solicitacao e data_conclusao de verdade (0031).
    percentile_cont(0.5) within group (
      order by (d.data_conclusao - d.data_solicitacao)
    ) filter (
      where d.data_conclusao is not null
        and d.data_solicitacao is not null
        and d.data_conclusao >= d.data_solicitacao
    )                                                             as ciclo_mediano_dias
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
    sum(peso)                                    as peso_total,
    sum(peso) filter (where concluido)           as peso_concluido
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
  -- Data de referência pra ordenar cronologicamente: o evento quando
  -- existe, senão o término, senão o início. É por ela que "a campanha
  -- anterior deste ministério" é definida.
  coalesce(c.data_evento, c.data_termino, c.data_inicio) as data_referencia,

  c.orcamento_planejado,
  c.orcamento_aprovado,

  -- Investimento realizado: o número da mídia quando existe (é o gasto
  -- de verdade, sincronizado), senão o que foi lançado à mão na campanha.
  coalesce(m.investimento_midia, c.investimento_realizado) as investimento,
  m.investimento_midia,
  c.investimento_realizado as investimento_manual,

  m.alcance,
  m.impressoes,
  m.cliques,
  m.vendas,

  -- Métricas derivadas. Toda divisão é protegida com nullif: sem base,
  -- o resultado é null (= "não dá pra calcular"), nunca zero.
  case when m.impressoes > 0
    then (m.cliques::numeric / nullif(m.impressoes, 0)) * 100 end            as ctr,
  case when m.cliques > 0
    then m.investimento_midia / nullif(m.cliques, 0) end                     as cpc,
  case when m.impressoes > 0
    then (m.investimento_midia / nullif(m.impressoes, 0)) * 1000 end         as cpm,
  case when m.vendas > 0
    then m.investimento_midia / nullif(m.vendas, 0) end                      as cpa,
  case when m.alcance > 0
    then m.impressoes::numeric / nullif(m.alcance, 0) end                    as frequencia,

  coalesce(d.demandas_total, 0)                as demandas_total,
  coalesce(d.demandas_concluidas, 0)           as demandas_concluidas,
  coalesce(d.demandas_com_prazo_aferivel, 0)   as demandas_com_prazo_aferivel,
  coalesce(d.demandas_no_prazo, 0)             as demandas_no_prazo,
  d.ciclo_mediano_dias,

  coalesce(e.entregas_total, 0)                as entregas_total,

  case when mk.peso_total > 0
    then round((mk.peso_concluido / mk.peso_total) * 100) end as progresso_marcos

from campaigns c
left join midia    m  on m.campaign_id  = c.id
left join demandas d  on d.campaign_id  = c.id
left join entregas e  on e.campaign_id  = c.id
left join marcos   mk on mk.campaign_id = c.id;


comment on view public.campanha_perfil is
  'Uma linha por campanha com métricas de mídia, demandas, entregas e marcos '
  'já agregadas. Base da camada de comparação e benchmark. Roda com as '
  'permissões de quem consulta (security_invoker), então cada ministério '
  'compara contra o próprio histórico e a Comunicação contra a carteira toda.';
