"use client";

import { cn } from "@/components/ui";

/* =========================================================================
   PRIMITIVOS DE GRÁFICO
   -------------------------------------------------------------------------
   Peças compartilhadas por todo gráfico do produto, pra eles lerem como
   um sistema só. Antes cada gráfico repetia os próprios hex de eixo, o
   próprio estilo de tooltip e a própria legenda.

   Como as cores entram: `rgb(var(--chart-N))` direto no atributo SVG. As
   variáveis CSS cascateiam pro SVG, então um gráfico repintado pelo
   toggle de tema não precisa de nenhum JavaScript — o mesmo `fill` passa
   a resolver pro degrau escuro sozinho.
   ========================================================================= */

export const CHART_COLORS = [
  "rgb(var(--chart-1))",
  "rgb(var(--chart-2))",
  "rgb(var(--chart-3))",
  "rgb(var(--chart-4))",
  "rgb(var(--chart-5))",
  "rgb(var(--chart-6))",
  "rgb(var(--chart-7))",
  "rgb(var(--chart-8))",
];

export const ACCENT = "rgb(var(--chart-accent))";
export const GRID = "rgb(var(--chart-grid))";
export const AXIS = "rgb(var(--chart-axis))";
/** Cinza de "resto/contexto" — para a forma de ênfase (uma série em
 *  destaque, as outras recuadas). */
export const MUTED = "rgb(var(--line-strong))";

/** Slot por índice, SEM ciclar: passando de 8, quem chama tem que
 *  agrupar o excedente em "Outros". Cor gerada na hora é indistinguível
 *  de outra sob daltonismo. */
export function seriesColor(i: number): string {
  return CHART_COLORS[i] ?? MUTED;
}

export const AXIS_TICK = {
  fontSize: 11,
  fill: AXIS,
  fontFamily: "var(--font-mono)",
} as const;

/** Tooltip próprio — o default do Recharts é branco fixo e some no tema
 *  escuro. Este herda superfície, borda e tinta do sistema. */
export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title?: string;
  rows: { label: string; value: string; color?: string }[];
  footer?: string;
}) {
  return (
    <div className="pointer-events-none min-w-[9rem] rounded-card border border-line bg-surface-raised px-3 py-2 shadow-lg">
      {title && <p className="mb-1.5 text-caption font-semibold text-ink">{title}</p>}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-caption">
            <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
              {r.color && (
                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: r.color }} aria-hidden="true" />
              )}
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-line pt-1.5 text-[0.6875rem] text-ink-3">{footer}</p>}
    </div>
  );
}

/** Legenda. Presente sempre que houver 2+ séries — é o que garante que a
 *  identidade nunca dependa só da cor. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string | number }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-caption text-ink-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: it.color }} aria-hidden="true" />
          <span>{it.label}</span>
          {it.value != null && <span className="font-medium tabular-nums text-ink">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ label, height = "h-52" }: { label: string; height?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-card bg-surface-sunken px-4 text-center text-caption text-ink-3", height)}>
      {label}
    </div>
  );
}

/** Tabela-sombra do gráfico: o mesmo dado em texto, dentro de um
 *  <details>. É o "table view" que a diretriz de acessibilidade exige
 *  quando uma cor de série não alcança 3:1 contra a superfície, e serve
 *  de saída pra leitor de tela em qualquer gráfico. */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) return null;
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer list-none text-caption text-ink-3 transition-colors hover:text-ink-2">
        <span className="underline decoration-dotted underline-offset-4">Ver os dados em tabela</span>
      </summary>
      <div className="mt-2 max-h-56 overflow-auto rounded-card border border-line">
        <table className="w-full text-left text-caption">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-sunken">
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={cn("px-3 py-1.5 font-mono text-label uppercase text-ink-3", i > 0 && "text-right")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) => (
                  <td key={ci} className={cn("px-3 py-1.5", ci > 0 ? "text-right tabular-nums text-ink" : "text-ink-2")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
