"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_COLOR, DEFAULT_STATUS_COLOR } from "@/lib/statusColors";

export type DemandRow = {
  id: string;
  identificador: string | null;
  titulo: string;
  status: string;
  statusLabel: string;
  prioridadeLabel: string | null;
  prazoFormatted: string;
  campanhas: { id: string; nome: string }[];
};

// Cada mês vira um acordeão independente, começa fechado — a ideia é a
// lista de demandas não ficar gigante e "largada" na tela toda vez que a
// página abre. O usuário expande só o mês que quer ver.
export function MonthAccordion({
  monthLabel,
  demands,
}: {
  monthLabel: string;
  demands: DemandRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-700">
          {monthLabel} <span className="font-normal text-neutral-400">({demands.length})</span>
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

      {open && (
        <table className="w-full border-t border-neutral-100 text-left text-sm">
          <thead className="border-b border-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Demanda</th>
              <th className="px-4 py-3 font-medium">Campanha/evento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => (
              <tr key={d.id} className="border-b border-neutral-50 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/demandas/${d.id}`} className="font-medium text-neutral-800 hover:underline">
                    {d.titulo}
                  </Link>
                  {d.identificador && (
                    <span className="ml-2 text-xs text-neutral-400">{d.identificador}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {d.campanhas.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {d.campanhas.map((c) => (
                        <span key={c.id} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                          {c.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLOR[d.status] ?? DEFAULT_STATUS_COLOR
                    }`}
                  >
                    {d.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 capitalize">{d.prioridadeLabel ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{d.prazoFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
