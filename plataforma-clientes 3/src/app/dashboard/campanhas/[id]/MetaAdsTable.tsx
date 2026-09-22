"use client";

import { useMemo, useState } from "react";
import {
  Icon, SearchInput, Table, TBody, TD, TH, THead, TR, TableScroll, TableEmpty,
  Tooltip, Pagination, cn,
} from "@/components/ui";
import { METRICS, formatMoney, formatCompact, formatPercent } from "@/lib/metricLanguage";
import type { MetaAd } from "@/lib/data/metaAds";

type SortKey = "nome" | "investimento" | "impressoes" | "cliques" | "ctr" | "cpc" | "cpm" | "vendas" | "cpa";

/* =========================================================================
   TABELA COMPLETA DE CRIATIVOS
   -------------------------------------------------------------------------
   É o "nível 5" do relatório: o dado bruto, pra quem quiser conferir.

   O que mudou além do visual:
   - Cabeçalho ordenável agora é <button> com aria-sort, e a seta de
     ordenação é ícone, não caractere "↑" solto no texto.
   - Cada sigla (CTR, CPC, CPM, CPA) carrega a explicação em tooltip. Esse
     relatório é lido por gente que não é de marketing.
   - Paginação: uma campanha grande tem dezenas de criativos, e despejar
     tudo numa tabela sem fim é onde a página começava a travar.
   - Colunas secundárias somem em telas estreitas em vez de empurrar a
     tabela pra 720px de largura mínima.
   ========================================================================= */

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hint?: string; hideBelow?: string }[] = [
  { key: "nome", label: "Criativo", numeric: false },
  { key: "investimento", label: "Investido", numeric: true },
  { key: "impressoes", label: "Exibições", numeric: true, hint: METRICS.impressoes.description, hideBelow: "hidden md:table-cell" },
  { key: "cliques", label: "Cliques", numeric: true, hideBelow: "hidden md:table-cell" },
  { key: "ctr", label: "CTR", numeric: true, hint: METRICS.ctr.description },
  { key: "cpc", label: "CPC", numeric: true, hint: METRICS.cpc.description, hideBelow: "hidden lg:table-cell" },
  { key: "cpm", label: "CPM", numeric: true, hint: METRICS.cpm.description, hideBelow: "hidden lg:table-cell" },
  { key: "vendas", label: "Resultados", numeric: true, hint: METRICS.vendas.description },
  { key: "cpa", label: "Custo/result.", numeric: true, hint: METRICS.cpa.description, hideBelow: "hidden lg:table-cell" },
];

const PAGE_SIZE = 12;

export function MetaAdsTable({ ads }: { ads: MetaAd[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("investimento");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ads
      .map((ad) => ({
        ...ad,
        cpa: ad.vendas != null && ad.vendas > 0 && ad.investimento != null ? ad.investimento / ad.vendas : null,
      }))
      .filter((ad) => ad.nome.toLowerCase().includes(term))
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

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      // Texto começa A→Z; número começa do maior, que é o que interessa.
      setSortAsc(key === "nome");
    }
    setPage(1);
  }

  if (ads.length === 0) {
    return <p className="py-6 text-center text-small text-ink-3">Ainda sem anúncios sincronizados para esta campanha.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-ink-3">
          <span className="font-medium tabular-nums text-ink">{rows.length}</span>{" "}
          {rows.length === 1 ? "criativo" : "criativos"}
        </p>
        <SearchInput
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar criativo..."
          aria-label="Buscar criativo"
          className="w-full sm:w-64"
        />
      </div>

      <TableScroll>
        <Table>
          <THead>
            <TR>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <TH
                    key={col.key}
                    numeric={col.numeric}
                    className={col.hideBelow}
                    aria-sort={active ? (sortAsc ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex min-h-6 items-center gap-1 rounded-sm transition-colors hover:text-ink",
                        col.numeric && "flex-row-reverse",
                        active && "text-ink"
                      )}
                    >
                      {col.hint ? (
                        <Tooltip content={col.hint}>
                          <span className="underline decoration-dotted underline-offset-2">{col.label}</span>
                        </Tooltip>
                      ) : (
                        col.label
                      )}
                      <Icon.ChevronDown
                        className={cn(
                          "h-3 w-3 transition-all duration-180",
                          active ? "opacity-100" : "opacity-0",
                          active && sortAsc && "rotate-180"
                        )}
                      />
                    </button>
                  </TH>
                );
              })}
            </TR>
          </THead>
          <TBody>
            {visible.length === 0 ? (
              <TableEmpty colSpan={COLUMNS.length}>Nenhum criativo com esse nome.</TableEmpty>
            ) : (
              visible.map((ad) => (
                <TR key={ad.id}>
                  <TD strong className="max-w-[16rem] truncate">
                    {ad.nome}
                  </TD>
                  <TD numeric>{formatMoney(ad.investimento, true)}</TD>
                  <TD numeric className="hidden md:table-cell">
                    {formatCompact(ad.impressoes)}
                  </TD>
                  <TD numeric className="hidden md:table-cell">
                    {formatCompact(ad.cliques)}
                  </TD>
                  <TD numeric>{formatPercent(ad.ctr, 2)}</TD>
                  <TD numeric className="hidden lg:table-cell">
                    {formatMoney(ad.cpc)}
                  </TD>
                  <TD numeric className="hidden lg:table-cell">
                    {formatMoney(ad.cpm)}
                  </TD>
                  <TD numeric>{formatCompact(ad.vendas)}</TD>
                  <TD numeric className="hidden lg:table-cell">
                    {formatMoney(ad.cpa)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableScroll>

      <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} total={rows.length} className="mt-3" />
    </div>
  );
}
