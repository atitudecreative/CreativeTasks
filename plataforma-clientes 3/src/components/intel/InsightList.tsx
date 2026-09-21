import { Icon, Badge, EmptyState, cn } from "@/components/ui";
import type { Insight, InsightSeveridade, InsightTipo } from "@/lib/insights";

/* =========================================================================
   LISTA DE INSIGHTS
   -------------------------------------------------------------------------
   A leitura automática do evento. Três decisões que importam:

   1. TODO INSIGHT MOSTRA A BASE. "12% acima da média" sem dizer média de
      quantos é retórica. O rodapé de cada item diz quantas campanhas
      sustentam a afirmação e contra o quê a comparação foi feita.

   2. SEM DADO, DIZ QUE NÃO TEM. Quando não há base, a tela afirma isso —
      em vez de simplesmente não aparecer, que deixaria o usuário achando
      que está tudo normal.

   3. A SEVERIDADE NÃO DEPENDE SÓ DE COR. Cada nível tem ícone próprio, e
      a ordem da lista (crítico primeiro) já carrega a hierarquia.
   ========================================================================= */

const SEVERIDADE: Record<
  InsightSeveridade,
  { Ico: (p: { className?: string }) => JSX.Element; cor: string; fundo: string; borda: string }
> = {
  critico: { Ico: Icon.AlertTriangle, cor: "text-danger", fundo: "bg-danger-soft", borda: "border-danger-line" },
  atencao: { Ico: Icon.AlertCircle, cor: "text-warning", fundo: "bg-warning-soft", borda: "border-warning-line" },
  positivo: { Ico: Icon.TrendingUp, cor: "text-success", fundo: "bg-success-soft", borda: "border-success-line" },
  neutro: { Ico: Icon.Info, cor: "text-info", fundo: "bg-info-soft", borda: "border-info-line" },
};

const TIPO_LABEL: Record<InsightTipo, string> = {
  eficiencia: "Eficiência",
  performance: "Performance",
  oportunidade: "Oportunidade",
  alerta: "Alerta",
  anomalia: "Anomalia",
  tendencia: "Tendência",
  financeiro: "Financeiro",
  operacional: "Operacional",
};

export function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERIDADE[insight.severidade];

  return (
    <li
      data-print-block=""
      className={cn("flex gap-3 rounded-card border px-4 py-3", s.borda, s.fundo)}
    >
      <s.Ico className={cn("mt-0.5 h-4 w-4 shrink-0", s.cor)} />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-small font-semibold text-ink">{insight.titulo}</p>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-3">
            {TIPO_LABEL[insight.tipo]}
          </span>
        </div>

        <p className="text-small leading-relaxed text-ink-2">{insight.descricao}</p>

        {insight.baseAmostra != null && insight.referencia && (
          <p className="mt-1.5 text-caption text-ink-3">
            Com base em {insight.baseAmostra}{" "}
            {insight.baseAmostra === 1 ? "campanha" : "campanhas"} · {insight.referencia}
          </p>
        )}
      </div>
    </li>
  );
}

export function InsightList({
  insights,
  amostraComparavel,
  dadosInsuficientes,
}: {
  insights: Insight[];
  amostraComparavel: number;
  dadosInsuficientes: boolean;
}) {
  if (insights.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.Sparkles className="h-4 w-4" />}
        title={dadosInsuficientes ? "Dados insuficientes para comparar" : "Nada fora do padrão"}
        description={
          dadosInsuficientes
            ? `A comparação precisa de pelo menos 4 eventos do mesmo tipo já publicados, e hoje ${
                amostraComparavel === 0
                  ? "não há nenhum"
                  : `há ${amostraComparavel}`
              }. Conforme mais eventos forem registrados, a leitura automática aparece aqui.`
            : "Os números deste evento estão dentro da faixa usual dos eventos semelhantes, sem estouro de orçamento nem atraso relevante."
        }
      />
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </ul>
      {amostraComparavel > 0 && (
        <p className="mt-3 text-caption text-ink-3">
          Leitura gerada a partir dos dados do próprio portal, comparando com{" "}
          <strong className="font-medium text-ink-2">{amostraComparavel}</strong>{" "}
          {amostraComparavel === 1 ? "evento semelhante" : "eventos semelhantes"}.
        </p>
      )}
    </>
  );
}

/** Resumo de uma linha, pro topo do relatório e pro dashboard. */
export function InsightResumo({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  const criticos = insights.filter((i) => i.severidade === "critico").length;
  const atencao = insights.filter((i) => i.severidade === "atencao").length;
  const positivos = insights.filter((i) => i.severidade === "positivo").length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {criticos > 0 && (
        <Badge tone="danger" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
          {criticos} {criticos === 1 ? "ponto crítico" : "pontos críticos"}
        </Badge>
      )}
      {atencao > 0 && (
        <Badge tone="warning" icon={<Icon.AlertCircle className="h-3 w-3" />}>
          {atencao} {atencao === 1 ? "ponto de atenção" : "pontos de atenção"}
        </Badge>
      )}
      {positivos > 0 && (
        <Badge tone="success" icon={<Icon.TrendingUp className="h-3 w-3" />}>
          {positivos} {positivos === 1 ? "destaque positivo" : "destaques positivos"}
        </Badge>
      )}
    </div>
  );
}
