"use client";

import { useMemo, useState } from "react";
import { MonthAccordion } from "./MonthAccordion";
import { DemandTable, type DemandRow } from "./DemandTable";
import { STATUS_OPTIONS, PRIORIDADE_OPTIONS } from "@/lib/demandOptions";

export type FilterCampaign = { id: string; nome: string };

function monthKeyOf(prazo: string | null): string {
  return prazo ? prazo.slice(0, 7) : "sem-prazo";
}

function formatMonthLabel(key: string): string {
  if (key === "sem-prazo") return "Sem prazo definido";
  const [year, month] = key.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function DemandasExplorer({
  demands,
  campaigns,
}: {
  demands: DemandRow[];
  campaigns: FilterCampaign[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [campanha, setCampanha] = useState("");

  const hasActiveFilter = Boolean(search.trim() || status || prioridade || campanha);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return demands.filter((d) => {
      const matchesSearch =
        !term ||
        normalize(d.titulo).includes(term) ||
        (d.identificador && normalize(d.identificador).includes(term)) ||
        d.campanhas.some((c) => normalize(c.nome).includes(term));
      const matchesStatus = !status || d.status === status;
      const matchesPrioridade = !prioridade || d.prioridade === prioridade;
      const matchesCampanha =
        !campanha ||
        (campanha === "none" ? d.campanhas.length === 0 : d.campanhas.some((c) => c.id === campanha));
      return matchesSearch && matchesStatus && matchesPrioridade && matchesCampanha;
    });
  }, [demands, search, status, prioridade, campanha]);

  const grouped = useMemo(() => {
    const map = new Map<string, DemandRow[]>();
    for (const d of demands) {
      const key = monthKeyOf(d.prazo);
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [demands]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="min-w-[14rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome da demanda, identificador (DEM-2026-...) ou campanha"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Campanha ou evento</label>
          <select
            value={campanha}
            onChange={(e) => setCampanha(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas</option>
            <option value="none">Sem campanha</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Prioridade</label>
          <select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas</option>
            {PRIORIDADE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPrioridade("");
              setCampanha("");
            }}
            className="text-sm text-neutral-500 hover:underline"
          >
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-neutral-400">
          {hasActiveFilter ? `${filtered.length} de ${demands.length}` : `${demands.length} demandas`}
        </span>
      </div>

      {demands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma demanda publicada ainda para este ministério a partir de 2026.
        </div>
      ) : hasActiveFilter ? (
        filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Nenhuma demanda encontrada. Tente outro termo ou limpe os filtros.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <DemandTable demands={filtered} />
          </div>
        )
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([key, rows]) => (
            <MonthAccordion key={key} monthLabel={formatMonthLabel(key)} demands={rows} />
          ))}
        </div>
      )}
    </div>
  );
}
