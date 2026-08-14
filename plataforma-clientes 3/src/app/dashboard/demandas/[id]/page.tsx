"use client";

import Link from "next/link";
import { STATUS_COLOR, DEFAULT_STATUS_COLOR } from "@/lib/statusColors";

export type DemandRow = {
  id: string;
  identificador: string | null;
  titulo: string;
  status: string;
  statusLabel: string;
  prioridade: string | null;
  prioridadeLabel: string | null;
  prazo: string | null;
  prazoFormatted: string;
  overdue: boolean;
  campanhas: { id: string; nome: string }[];
  childCount: number;
};

export function DemandTable({ demands }: { demands: DemandRow[] }) {
  return (
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
              {d.childCount > 0 && (
                <span className="ml-2 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                  +{d.childCount} {d.childCount === 1 ? "subtarefa" : "subtarefas"}
                </span>
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
            <td className="px-4 py-3">
              <span className={d.overdue ? "font-medium text-rose-600" : "text-neutral-600"}>
                {d.prazoFormatted}
              </span>
              {d.overdue && (
                <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                  Atrasada
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
