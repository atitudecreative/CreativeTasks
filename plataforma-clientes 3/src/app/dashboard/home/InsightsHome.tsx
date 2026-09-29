import Link from "next/link";
import { Icon, cn } from "@/components/ui";
import type { Insight, TomInsight } from "@/lib/home";

/* =========================================================================
   INSIGHTS
   -------------------------------------------------------------------------
   Frases geradas pelas regras de lib/home.ts — nenhuma é escrita à mão, e
   cada uma mostra embaixo em que base foi calculada. Sem base, a regra
   não dispara e a seção diz isso, em vez de inventar uma conclusão.

   Tom com ícone e palavra, nunca só cor: verde (a favor), vermelho
   (contra), âmbar (pede atenção), neutro (informação).
   ========================================================================= */

const TOM: Record<TomInsight, { ico: React.ReactNode; chip: string; rotulo: string }> = {
  positivo: { ico: <Icon.TrendingUp className="h-4 w-4" />, chip: "bg-success-soft text-success", rotulo: "A favor" },
  negativo: { ico: <Icon.TrendingDown className="h-4 w-4" />, chip: "bg-danger-soft text-danger", rotulo: "Contra" },
  atencao: { ico: <Icon.AlertTriangle className="h-4 w-4" />, chip: "bg-warning-soft text-warning", rotulo: "Atenção" },
  neutro: { ico: <Icon.Sparkles className="h-4 w-4" />, chip: "bg-info-soft text-info", rotulo: "Leitura" },
};

export function InsightsHome({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <p className="rounded-panel border border-dashed border-line-strong px-5 py-6 text-small text-ink-3">
        Ainda não há dados suficientes neste período para uma leitura automática confiável — as frases aparecem
        quando houver comparação, conversão rastreada ou histórico semanal que as sustente.
      </p>
    );
  }

  return (
    <ul className="signal-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((i) => {
        const t = TOM[i.tom];
        const corpo = (
          <>
            <span className="flex items-center gap-2">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", t.chip)}>{t.ico}</span>
              <span className="font-mono text-label uppercase text-ink-3">{t.rotulo}</span>
              {i.href && (
                <Icon.ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-3 transition-transform duration-180 group-hover:translate-x-0.5" />
              )}
            </span>
            <span className="mt-3 block text-small leading-relaxed text-ink">{i.texto}</span>
            <span className="mt-auto block pt-3 text-[0.6875rem] text-ink-3">Base: {i.base}</span>
          </>
        );
        const classe =
          "group flex h-full flex-col rounded-panel border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow] duration-180";
        return (
          <li key={i.id}>
            {i.href ? (
              <Link href={i.href} className={cn(classe, "hover:border-line-strong hover:shadow-sm")}>
                {corpo}
              </Link>
            ) : (
              <div className={classe}>{corpo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
