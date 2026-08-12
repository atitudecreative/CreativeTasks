"use client";

import { useState } from "react";
import { DemandTable, type DemandRow } from "./DemandTable";

export type { DemandRow };

// Cada mês vira um acordeão independente, começa fechado — a ideia é a
// lista de demandas não ficar gigante e "largada" na tela toda vez que a
// página abre. O usuário expande só o mês que quer ver (ou usa a busca,
// que ignora esse agrupamento e mostra tudo que bateu numa lista só).
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

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-700">
          {monthLabel} <span className="font-normal text-neutral-400">({demands.length})</span>
          {overdueCount > 0 && (
            <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
              {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && <DemandTable demands={demands} />}
    </div>
  );
}
