/* =========================================================================
   LINGUAGEM DE MÉTRICAS
   -------------------------------------------------------------------------
   Um lugar só define, pra cada indicador da plataforma: como se chama,
   como se formata, o que significa em português claro, e se subir é bom
   ou ruim.

   Por que isso importa aqui mais do que num produto comum: a plataforma
   é de PRESTAÇÃO DE CONTAS, e quem lê o relatório muitas vezes não é de
   marketing. "CPA: 12,40" não diz nada; "Custo por resultado — quanto
   custou, em média, cada conversão" diz. Antes essas siglas apareciam
   cruas, cada tela formatava do seu jeito, e não havia nenhuma explicação
   em lugar nenhum.

   `betterWhen` alimenta a seta de variação: em CPA, CPC e CPM, SUBIR é
   ruim — pintar de verde uma alta de custo seria mentir pro cliente.
   ========================================================================= */

export type MetricKey =
  | "investimento"
  | "alcance"
  | "impressoes"
  | "cliques"
  | "ctr"
  | "cpc"
  | "cpm"
  | "vendas"
  | "cpa"
  | "frequencia"
  | "orcamento_planejado"
  | "orcamento_aprovado"
  | "demandas"
  | "entregas"
  | "progresso";

export type MetricFormat = "money" | "money-precise" | "integer" | "percent" | "decimal";

export type MetricDef = {
  label: string;
  /** Nome longo, pro cliente que não é da área. */
  plainLabel: string;
  description: string;
  format: MetricFormat;
  betterWhen: "higher" | "lower" | "neutral";
};

export const METRICS: Record<MetricKey, MetricDef> = {
  investimento: {
    label: "Investimento",
    plainLabel: "Investimento realizado",
    description: "Quanto foi efetivamente gasto em mídia paga nesta campanha.",
    format: "money",
    betterWhen: "neutral",
  },
  alcance: {
    label: "Alcance",
    plainLabel: "Pessoas alcançadas",
    description: "Quantas pessoas diferentes viram pelo menos um anúncio. Cada pessoa conta uma vez só.",
    format: "integer",
    betterWhen: "higher",
  },
  impressoes: {
    label: "Impressões",
    plainLabel: "Exibições",
    description: "Quantas vezes os anúncios apareceram na tela. A mesma pessoa pode gerar várias.",
    format: "integer",
    betterWhen: "higher",
  },
  cliques: {
    label: "Cliques",
    plainLabel: "Cliques nos anúncios",
    description: "Quantas vezes alguém clicou no anúncio.",
    format: "integer",
    betterWhen: "higher",
  },
  ctr: {
    label: "CTR",
    plainLabel: "Taxa de cliques",
    description: "De cada 100 exibições, quantas viraram clique. Mede o quanto a peça chamou atenção.",
    format: "percent",
    betterWhen: "higher",
  },
  cpc: {
    label: "CPC",
    plainLabel: "Custo por clique",
    description: "Quanto custou, em média, cada clique.",
    format: "money-precise",
    betterWhen: "lower",
  },
  cpm: {
    label: "CPM",
    plainLabel: "Custo por mil exibições",
    description: "Quanto custou, em média, exibir o anúncio mil vezes. Mede o preço do alcance.",
    format: "money-precise",
    betterWhen: "lower",
  },
  vendas: {
    label: "Resultados",
    plainLabel: "Conversões registradas",
    description:
      "Ações concluídas e rastreadas pelo site (inscrição, compra de ingresso etc.). Aparece em branco quando não há rastreamento configurado — o que é diferente de zero resultado.",
    format: "integer",
    betterWhen: "higher",
  },
  cpa: {
    label: "Custo por resultado",
    plainLabel: "Custo por conversão",
    description: "Quanto foi investido, em média, para conseguir cada resultado.",
    format: "money-precise",
    betterWhen: "lower",
  },
  frequencia: {
    label: "Frequência",
    plainLabel: "Exibições por pessoa",
    description: "Quantas vezes, em média, cada pessoa alcançada viu o anúncio.",
    format: "decimal",
    betterWhen: "neutral",
  },
  orcamento_planejado: {
    label: "Planejado",
    plainLabel: "Orçamento planejado",
    description: "Valor previsto na fase de planejamento da campanha.",
    format: "money",
    betterWhen: "neutral",
  },
  orcamento_aprovado: {
    label: "Aprovado",
    plainLabel: "Orçamento aprovado",
    description: "Valor efetivamente liberado para a campanha.",
    format: "money",
    betterWhen: "neutral",
  },
  demandas: {
    label: "Demandas",
    plainLabel: "Demandas da campanha",
    description: "Peças e tarefas de comunicação produzidas para esta campanha.",
    format: "integer",
    betterWhen: "neutral",
  },
  entregas: {
    label: "Entregas",
    plainLabel: "Arquivos entregues",
    description: "Materiais finais disponibilizados (artes, vídeos, links).",
    format: "integer",
    betterWhen: "neutral",
  },
  progresso: {
    label: "Progresso",
    plainLabel: "Progresso dos marcos",
    description: "Percentual concluído, ponderado pelo peso de cada marco da campanha.",
    format: "percent",
    betterWhen: "higher",
  },
};

const EM_DASH = "—";

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;

  switch (format) {
    case "money":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    case "money-precise":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
    case "percent":
      return `${value.toFixed(value < 10 ? 2 : 1)}%`;
    case "decimal":
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    case "integer":
    default:
      return Math.round(value).toLocaleString("pt-BR");
  }
}

/** Formata já sabendo qual métrica é — o que as telas usam. */
export function formatByKey(key: MetricKey, value: number | null | undefined): string {
  return formatMetric(value, METRICS[key].format);
}

/** Número grande em forma compacta (12,4 mil / 1,2 mi) — só para KPI de
 *  destaque, onde sete dígitos quebrariam o layout. O valor exato
 *  continua disponível no tooltip e na tabela. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  if (Math.abs(value) < 10000) return Math.round(value).toLocaleString("pt-BR");
  return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

export function formatMoney(value: number | null | undefined, compact = false): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  if (compact && Math.abs(value) >= 10000) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: compact ? 0 : 2 });
}

/** Variação percentual entre dois valores. Devolve null quando não há
 *  base de comparação — melhor não mostrar seta nenhuma do que mostrar
 *  uma variação sem referência. */
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** true quando a métrica é daquelas em que subir é ruim (custos) — o
 *  componente de variação usa isso pra inverter as cores. */
export function isInverted(key: MetricKey): boolean {
  return METRICS[key].betterWhen === "lower";
}
