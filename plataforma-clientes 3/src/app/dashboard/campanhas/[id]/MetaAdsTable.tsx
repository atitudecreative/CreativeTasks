"use client";

import { useMemo, useState } from "react";
import type { MetaAd } from "@/lib/data/metaAds";

type SortKey = "nome" | "investimento" | "impressoes" | "cliques" | "ctr" | "cpc" | "cpm" | "vendas" | "cpa";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "nome", label: "Criativo" },
  { key: "investimento", label: "Investido" },
  { key: "impressoes", label: "Impressões" },
  { key: "cliques", label: "Cliques" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "vendas", label: "Vendas" },
  { key: "cpa", label: "CPA" },
];

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(2)}%`;
}

export function MetaAdsTable({ ads }: { ads: MetaAd[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("investimento");
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    return ads
      .map((ad) => ({
        ...ad,
        cpa: ad.vendas != null && ad.vendas > 0 && ad.investimento != null ? ad.investimento / ad.vendas : null,
      }))
      .filter((ad) => ad.nome.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : Number(va) - Number(vb);
        return sortAsc ? cmp : -cmp;
      });
  }, [ads, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === "nome");
    }
  }

  if (ads.length === 0) {
    return <p className="text-sm text-neutral-400">Ainda sem anúncios sincronizados pra essa campanha.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar criativo..."
          className="w-56 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-400">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium hover:text-neutral-700"
                >
                  {col.label} {sortKey === col.key && (sortAsc ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ad) => (
              <tr key={ad.id} className="border-b border-neutral-50 last:border-0">
                <td className="max-w-[220px] truncate px-3 py-2 font-medium text-neutral-800">{ad.nome}</td>
                <td className="px-3 py-2 text-neutral-700">{formatMoney(ad.investimento)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatNumber(ad.impressoes)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatNumber(ad.cliques)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatPercent(ad.ctr)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatMoney(ad.cpc)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatMoney(ad.cpm)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatNumber(ad.vendas)}</td>
                <td className="px-3 py-2 text-neutral-700">{formatMoney(ad.cpa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
