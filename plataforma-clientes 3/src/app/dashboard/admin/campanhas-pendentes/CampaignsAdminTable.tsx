"use client";

import { useMemo, useState } from "react";
import { CampaignRow, type CampaignRowData } from "./CampaignRow";

export type AdminCampaignRow = CampaignRowData & {
  ministryName: string;
};

function MinistryGroup({
  ministryName,
  campaigns,
  defaultOpen,
}: {
  ministryName: string;
  campaigns: AdminCampaignRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount = campaigns.filter((c) => c.publicada).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-700">
          {ministryName}{" "}
          <span className="font-normal text-neutral-400">
            ({activeCount} ativa{activeCount !== 1 ? "s" : ""} de {campaigns.length})
          </span>
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
        <div className="border-t border-neutral-100">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CampaignsAdminTable({ campaigns }: { campaigns: AdminCampaignRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ativas" | "ocultas">("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      const matchesSearch =
        !term || c.nome.toLowerCase().includes(term) || c.ministryName.toLowerCase().includes(term);
      const matchesStatus =
        !statusFilter || (statusFilter === "ativas" ? c.publicada : !c.publicada);
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminCampaignRow[]>();
    for (const c of filtered) {
      const list = map.get(c.ministryName) ?? [];
      list.push(c);
      map.set(c.ministryName, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filtered]);

  // Com busca ativa faz sentido já abrir os grupos que bateram — sem
  // busca, tudo começa fechado (é a mesma ideia das demandas por mês: não
  // afogar a tela com listão gigante logo de cara).
  const hasActiveFilter = Boolean(search.trim() || statusFilter);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou ministério..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "ativas" | "ocultas")}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Todas</option>
          <option value="ativas">Ativas (visíveis)</option>
          <option value="ocultas">Ocultas</option>
        </select>
        <span className="text-xs text-neutral-400">
          {filtered.length} de {campaigns.length}
        </span>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          {campaigns.length === 0
            ? "Nenhuma campanha cadastrada ainda."
            : "Nenhuma campanha encontrada para esse filtro."}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([ministryName, group]) => (
            <MinistryGroup
              key={ministryName}
              ministryName={ministryName}
              campaigns={group}
              defaultOpen={hasActiveFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
