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

/* -------------------------------------------------------------------------
   Percentual
   -------------------------------------------------------------------------
   Em pt-BR a casa decimal é vírgula. A plataforma formatava dinheiro com
   toLocaleString("pt-BR") — "R$ 1.284,50" — e percentual com toFixed(),
   que é do JavaScript e escreve sempre com PONTO. Resultado: "R$ 12.641,75"
   e "3.00%" lado a lado na mesma tela, em um produto brasileiro.

   Um formatador só, usado por todo mundo, resolve — e evita que a próxima
   tela repita o toFixed().
   ------------------------------------------------------------------------- */
export function formatPercent(
  value: number | null | undefined,
  casas: number | "auto" = "auto"
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  // "auto": duas casas abaixo de 10 (onde 3,25% e 3,3% dizem coisas
  // diferentes) e uma acima.
  const d = casas === "auto" ? (Math.abs(value) < 10 ? 2 : 1) : casas;
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
}

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;

  switch (format) {
    case "money":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    case "money-precise":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
    case "percent":
      return formatPercent(value);
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

/* -------------------------------------------------------------------------
   Forma compacta
   -------------------------------------------------------------------------
   Escrita à mão, e não com `notation: "compact"` do Intl, por um motivo
   que só aparece no navegador: a tabela de compactação faz parte do ICU, e
   o ICU do Node não é o mesmo do Chrome. Para R$ 42.000 o servidor
   renderizava "R$ 42,0 mil" e o navegador "R$ 42 mil".

   Texto diferente entre servidor e cliente é erro de hidratação: o React
   descarta o HTML recebido e re-renderiza a árvore inteira no cliente
   (#418/#423 em produção). Cada cartão de campanha disparava isso — a
   página chegava pronta e era refeita do zero.

   A regra aqui é fixa e não depende de biblioteca: uma casa decimal,
   escondida quando é zero.
   ------------------------------------------------------------------------- */

const ESCALAS: [number, string][] = [
  [1e12, "tri"],
  [1e9, "bi"],
  [1e6, "mi"],
  [1e3, "mil"],
];

function compactar(value: number): { numero: string; sufixo: string } | null {
  const abs = Math.abs(value);
  for (const [limite, sufixo] of ESCALAS) {
    if (abs >= limite) {
      const n = value / limite;
      const arredondado = Math.round(n * 10) / 10;
      const numero = Number.isInteger(arredondado)
        ? String(arredondado)
        : arredondado.toFixed(1).replace(".", ",");
      return { numero, sufixo };
    }
  }
  return null;
}

/** Número grande em forma compacta (12,6 mil / 1,3 mi) — só para KPI de
 *  destaque, onde sete dígitos quebrariam o layout. O valor exato
 *  continua disponível no tooltip e na tabela. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  if (Math.abs(value) < 10000) return Math.round(value).toLocaleString("pt-BR");
  const c = compactar(value);
  return c ? `${c.numero} ${c.sufixo}` : Math.round(value).toLocaleString("pt-BR");
}

export function formatMoney(value: number | null | undefined, compact = false): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  if (compact && Math.abs(value) >= 10000) {
    const c = compactar(value);
    if (c) return `R$ ${c.numero} ${c.sufixo}`;
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
