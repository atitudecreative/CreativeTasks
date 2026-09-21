import { Icon, cn } from "@/components/ui";
import type { Milestone } from "@/lib/data/campaigns";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem data";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* =========================================================================
   LINHA DO TEMPO DE MARCOS
   -------------------------------------------------------------------------
   A lógica de "linha preenchida só até o último marco concluído em
   sequência" foi mantida — é uma decisão correta do desenho anterior:
   marcar um marco adiantado como concluído não deve pintar o caminho
   inteiro como se tudo antes tivesse acontecido.

   O que mudou: o marco atual (o próximo a fazer) ganha destaque próprio,
   em vez de tudo pendente parecer igual; concluído recebe ícone de
   confirmação além do preenchimento (não depende só de cor/forma); e o
   peso de cada marco, que existe no banco e alimenta o cálculo de
   progresso, passa a ser visível — sem isso o cliente não entende por que
   3 de 6 marcos não dá 50%.
   ========================================================================= */
export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  let lastSequentialDoneIndex = -1;
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].concluido) break;
    lastSequentialDoneIndex = i;
  }
  const nextIndex = milestones.findIndex((m) => !m.concluido);

  return (
    <ol className="relative">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        const lineIsFilled = i < lastSequentialDoneIndex;
        const isNext = i === nextIndex;

        return (
          <li key={m.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[9px] top-5 h-full w-px",
                  lineIsFilled ? "bg-brand-500" : "bg-line-strong"
                )}
              />
            )}

            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2",
                m.concluido
                  ? "border-brand-600 bg-brand-600 text-white"
                  : isNext
                    ? "border-brand-500 bg-surface"
                    : "border-line-strong bg-surface"
              )}
            >
              {m.concluido ? (
                <Icon.Check className="h-3 w-3" strokeWidth={3} />
              ) : isNext ? (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              ) : null}
            </span>

            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p
                  className={cn(
                    "text-small",
                    m.concluido ? "text-ink-3" : isNext ? "font-medium text-ink" : "text-ink-2"
                  )}
                >
                  {m.nome}
                </p>
                {isNext && (
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-brand-600">
                    próximo
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-caption text-ink-3">
                {m.concluido ? `Concluído em ${formatDate(m.data_conclusao)}` : `Previsto para ${formatDate(m.data_prevista)}`}
                {m.peso !== 1 && <span className="ml-1.5 opacity-70">· peso {m.peso}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
