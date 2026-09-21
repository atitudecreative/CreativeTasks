"use client";

import { useState } from "react";
import { cn, Tooltip } from "@/components/ui";
import type { StageCount } from "@/lib/demandStages";

/* =========================================================================
   BARRA DE ESTÁGIOS
   -------------------------------------------------------------------------
   Substitui o gráfico de pizza de 14 fatias que existia no dashboard.

   Por que barra empilhada horizontal e não pizza: o dado é parte-de-todo
   com categorias de nome longo e uma ORDEM que importa (fila -> produção
   -> com o ministério -> concluída). Barra horizontal respeita as três
   coisas; pizza destrói a ordem e não comporta rótulo longo.

   Detalhes que fazem ela funcionar:
   - 2px de vão entre segmentos (a superfície aparecendo), pra dois tons
     vizinhos nunca se fundirem num bloco só.
   - Rótulo direto DENTRO do segmento quando ele tem largura pra isso;
     nos estreitos, só a legenda — nunca um número em cima de cada um.
   - Legenda sempre presente, com nome e contagem: a identidade nunca
     depende só da cor.
   - Passar o mouse num segmento realça ele e recua os outros.
   ========================================================================= */

export function StageBar({
  stages,
  total,
  className,
  height = "h-9",
}: {
  stages: StageCount[];
  total: number;
  className?: string;
  height?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (total === 0 || stages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-card bg-surface-sunken text-caption text-ink-3", height, className)}>
        Nenhuma demanda no período.
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("flex w-full gap-0.5 overflow-hidden", height)} role="img" aria-label={
        `Distribuição de ${total} demandas: ` + stages.map((s) => `${s.count} ${s.label}`).join(", ")
      }>
        {stages.map((s, i) => {
          const pct = (s.count / total) * 100;
          const dim = hovered !== null && hovered !== s.key;
          // Rótulo interno só quando cabe de verdade (~12% da barra).
          const showInline = pct >= 12;
          return (
            <Tooltip
              key={s.key}
              content={
                <span>
                  <strong>{s.label}</strong> — {s.count} {s.count === 1 ? "demanda" : "demandas"} ({pct.toFixed(0)}%)
                  <br />
                  {s.description}
                </span>
              }
              // A largura vive no WRAPPER do tooltip: ele é o item de
              // flex. Aplicá-la no filho não adiantava — o wrapper
              // inline-flex encolhia pro conteúdo e a barra inteira
              // ficava do tamanho dos rótulos.
              style={{ width: `${pct}%`, minWidth: "0.5rem" }}
              className={cn("block h-full min-w-0 transition-opacity duration-180", dim && "opacity-35")}
            >
              <span
                onMouseEnter={() => setHovered(s.key)}
                onMouseLeave={() => setHovered(null)}
                style={{ backgroundColor: s.color }}
                className={cn(
                  "flex h-full w-full items-center justify-center overflow-hidden px-1.5",
                  "transition-[filter] duration-180",
                  i === 0 && "rounded-l-[6px]",
                  i === stages.length - 1 && "rounded-r-[6px]",
                  hovered === s.key && "brightness-110"
                )}
              >
                {showInline && (
                  <span className="truncate text-[0.6875rem] font-semibold tabular-nums text-white drop-shadow-sm">
                    {s.count}
                  </span>
                )}
              </span>
            </Tooltip>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {stages.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "flex cursor-default items-center gap-1.5 text-caption transition-opacity duration-180",
              hovered !== null && hovered !== s.key && "opacity-45"
            )}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="text-ink-2">{s.label}</span>
            <span className="font-medium tabular-nums text-ink">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
