"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { deriveMetaKpis } from "@/lib/metaAdsMath";
import type { MetaMetricsSummary } from "@/lib/metaAdsMath";
import type { MetaAdCampaign, MetaAd, MetaWeeklyStat, MetaDemographicItem } from "@/lib/data/metaAds";
import { MetaWeeklyChart, MetaGenderChart, MetaAgeChart, MetaAdsRanking, MetaAgeSummaryList } from "./MetaAdsCharts";
import { MetaAdsTable } from "./MetaAdsTable";
import { IconTrendingUp, IconWallet, IconCheckCircle, IconTarget, IconDownload, IconPrinter } from "./icons";

type Tab = "visao" | "criativos" | "publico";

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWeekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Painel padrão dos gráficos aqui dentro — borda + rótulo em caixa alta,
// sempre com o mesmo padding/raio, pra tudo alinhar em grid sem sobras
// de espaço diferentes entre um card e outro.
function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-neutral-100 bg-neutral-50/40 p-4 ${className}`}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{title}</p>
      {children}
    </div>
  );
}

// CSV simples (separador ;, igual ao padrão do Excel em pt-BR) — sem
// biblioteca nenhuma, só um Blob baixado direto no navegador.
function downloadAdsCsv(ads: MetaAd[], campaignNome: string) {
  const header = ["Criativo", "Investido", "Impressões", "Cliques", "CTR", "CPC", "CPM", "Vendas"];
  const lines = ads.map((ad) =>
    [
      ad.nome,
      ad.investimento ?? "",
      ad.impressoes ?? "",
      ad.cliques ?? "",
      ad.ctr ?? "",
      ad.cpc ?? "",
      ad.cpm ?? "",
      ad.vendas ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );
  const csv = [header.join(";"), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meta-ads-${campaignNome.trim().toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CampaignMetaReport({
  campaignNome,
  publicada,
  metaCampaigns,
  metaMetrics,
  metaWeekly,
  metaDemographics,
  metaAds,
}: {
  campaignNome: string;
  publicada: boolean;
  metaCampaigns: MetaAdCampaign[];
  metaMetrics: MetaMetricsSummary;
  metaWeekly: MetaWeeklyStat[];
  metaDemographics: { genero: MetaDemographicItem[]; idade: MetaDemographicItem[] };
  metaAds: MetaAd[];
}) {
  const [tab, setTab] = useState<Tab>("visao");
  const [selectedWeek, setSelectedWeek] = useState<string>("total");

  const kpis = useMemo(() => {
    if (selectedWeek === "total") return metaMetrics;
    const week = metaWeekly.find((w) => w.semana_inicio === selectedWeek);
    if (!week) return metaMetrics;
    const vendas = week.vendas;
    return {
      investimento: week.investimento,
      impressoes: week.impressoes,
      cliques: week.cliques,
      alcance: null as number | null,
      vendas,
      vendasDisponivel: vendas != null,
      ...deriveMetaKpis({ investimento: week.investimento, impressoes: week.impressoes, cliques: week.cliques, vendas }),
    };
  }, [selectedWeek, metaMetrics, metaWeekly]);

  return (
    <div className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconTrendingUp className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-800">Relatório de performance · Meta Ads</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  publicada ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {publicada ? "Ativa" : "Oculta"}
              </span>
              {metaCampaigns.length > 1 && (
                <span className="text-xs text-neutral-400">Soma de {metaCampaigns.length} campanhas do Meta vinculadas</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAdsCsv(metaAds, campaignNome)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-700 hover:shadow"
          >
            <IconPrinter className="h-3.5 w-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Abas + filtro de semana, na mesma linha pra economizar altura */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-neutral-100 p-1">
          {(
            [
              ["visao", "Visão geral"],
              ["criativos", `Criativos (${metaAds.length})`],
              ["publico", "Análise de público"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                tab === key ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {metaWeekly.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedWeek("total")}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                selectedWeek === "total"
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              Todo o período
            </button>
            {metaWeekly.map((w) => (
              <button
                key={w.semana_inicio}
                type="button"
                onClick={() => setSelectedWeek(w.semana_inicio)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  selectedWeek === w.semana_inicio
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {formatWeekLabel(w.semana_inicio)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs — grid fixo de 6 colunas em telas médias+, todas as células
          com a mesma altura/padding (MetricCard cuida disso sozinho). */}
      <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Investido" value={formatMoney(kpis.investimento)} accent="brand" icon={<IconWallet className="h-4 w-4" />} />
        <MetricCard
          label="Vendas"
          value={kpis.vendasDisponivel ? (kpis.vendas ?? 0).toLocaleString("pt-BR") : "—"}
          hint={kpis.vendasDisponivel ? undefined : "sem rastreamento"}
          accent="green"
          icon={<IconCheckCircle className="h-4 w-4" />}
        />
        <MetricCard label="CPA" value={kpis.cpa != null ? formatMoney(kpis.cpa) : "—"} accent="amber" icon={<IconTarget className="h-4 w-4" />} />
        <MetricCard label="CTR" value={kpis.ctr != null ? `${kpis.ctr.toFixed(2)}%` : "—"} accent="walnut" />
        <MetricCard label="CPM" value={kpis.cpm != null ? formatMoney(kpis.cpm) : "—"} accent="walnut" />
        <MetricCard label="CPC" value={kpis.cpc != null ? formatMoney(kpis.cpc) : "—"} accent="walnut" />
      </div>

      <p className="mb-5 text-xs text-neutral-400">
        {kpis.alcance != null && <>Alcance {kpis.alcance.toLocaleString("pt-BR")} · </>}
        Impressões {kpis.impressoes.toLocaleString("pt-BR")} · Cliques {kpis.cliques.toLocaleString("pt-BR")}
      </p>

      {tab === "visao" && (
        <div className="space-y-4">
          <Panel title="Evolução semanal">
            <MetaWeeklyChart data={metaWeekly} />
          </Panel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Público por gênero">
              <MetaGenderChart data={metaDemographics.genero} />
            </Panel>
            <Panel title="Distribuição por idade">
              <MetaAgeSummaryList data={metaDemographics.idade} />
              <MetaAgeChart data={metaDemographics.idade} />
            </Panel>
          </div>
          {/* Barra horizontal — largura total, sem dividir coluna, pra
              caber o nome de cada criativo sem cortar. */}
          <Panel title="Investimento por criativo">
            <MetaAdsRanking ads={metaAds} />
          </Panel>
        </div>
      )}

      {tab === "criativos" && (
        <div className="space-y-4">
          <Panel title="Investimento por criativo">
            <MetaAdsRanking ads={metaAds} />
          </Panel>
          <Panel title={`Tabela completa (${metaAds.length})`}>
            <MetaAdsTable ads={metaAds} />
          </Panel>
        </div>
      )}

      {tab === "publico" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Público por gênero">
            <MetaGenderChart data={metaDemographics.genero} />
          </Panel>
          <Panel title="Distribuição por idade">
            <MetaAgeSummaryList data={metaDemographics.idade} />
            <MetaAgeChart data={metaDemographics.idade} />
          </Panel>
        </div>
      )}
    </div>
  );
}
