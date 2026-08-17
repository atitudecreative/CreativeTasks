import type { Milestone } from "@/lib/data/campaigns";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "sem data";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

// Linha do tempo vertical dos marcos da campanha: uma linha conectando os
// pontos, ponto preenchido = concluído, contorno = pendente. A linha entre
// dois pontos fica colorida (indicando progresso) só até o último marco
// concluído em sequência — depois disso volta a ser cinza, mesmo que um
// marco mais à frente já tenha sido marcado como concluído fora de ordem.
export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  // índice do último marco concluído em sequência a partir do início
  let lastSequentialDoneIndex = -1;
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].concluido) break;
    lastSequentialDoneIndex = i;
  }

  return (
    <ol>
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        const lineIsFilled = i < lastSequentialDoneIndex;

        return (
          <li key={m.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[7px] top-4 h-full w-px ${
                  lineIsFilled ? "bg-brand-500" : "bg-neutral-200"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                m.concluido
                  ? "border-brand-600 bg-brand-600"
                  : "border-neutral-300 bg-white"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${m.concluido ? "text-neutral-500 line-through" : "text-neutral-800"}`}>
                {m.nome}
              </p>
              <p className="text-xs text-neutral-400">
                {m.concluido ? `concluído em ${formatDate(m.data_conclusao)}` : `previsto: ${formatDate(m.data_prevista)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
