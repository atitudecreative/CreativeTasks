"use client";

import { useState } from "react";
import { Badge, Icon, cn } from "@/components/ui";
import { DemandTable, type DemandRow } from "./DemandTable";

export type { DemandRow };

/* Cada mês é um acordeão independente, fechado por padrão — sem isso a
   lista inteira despenca na tela a cada abertura. Mantido do desenho
   anterior porque funciona; o que mudou é a densidade do cabeçalho, que
   agora mostra o saldo do mês (quantas, quantas atrasadas) antes de
   abrir, e o aria-expanded que faltava. */
export function MonthAccordion({
  monthLabel,
  demands,
  defaultOpen = false,
}: {
  monthLabel: string;
  demands: DemandRow[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const overdueCount = demands.filter((d) => d.overdue).length;
  const doneCount = demands.filter((d) => d.status === "concluida").length;

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-120 hover:bg-surface-sunken sm:px-5",
          open && "border-b border-line"
        )}
      >
        <Icon.ChevronRight
          className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform duration-180 ease-snap", open && "rotate-90")}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-h4 text-ink">{monthLabel}</span>
          <span className="mt-0.5 block text-caption text-ink-3">
            {demands.length} {demands.length === 1 ? "demanda" : "demandas"}
            {doneCount > 0 && ` · ${doneCount} concluída${doneCount !== 1 ? "s" : ""}`}
          </span>
        </span>
        {overdueCount > 0 && (
          <Badge tone="danger" size="sm" icon={<Icon.AlertTriangle className="h-3 w-3" />}>
            {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </button>

      {open && <DemandTable demands={demands} />}
    </div>
  );
}
