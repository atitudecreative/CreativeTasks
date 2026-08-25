"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { deriveMetaKpis } from "@/lib/metaAdsMath";
import type { MetaMetricsSummary } from "@/lib/metaAdsMath";
import type { MetaAdCampaign, MetaAd, MetaWeeklyStat, MetaDemographicItem } from "@/lib/data/metaAds";
import { MetaWeeklyChart, MetaGenderChart, MetaAgeChart, MetaAdsRanking, MetaAgeSummaryList } from "./MetaAdsCharts";
import { MetaAdsTable } from "./MetaAdsTable";
import { IconTrendingUp } from "./icons";

type Tab = "visao" | "criativos" | "publico";

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWeekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
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
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-4 flex gap-1 border-b border-neutral-100">
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
            className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${
              tab === key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtro por semana */}
      {metaWeekly.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedWeek("total")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              selectedWeek === "total"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
            }`}
          >
            Todo o período
          </button>
          {metaWeekly.map((w) => (
            <button
              key={w.semana_inicio}
              type="button"
              onClick={() => setSelectedWeek(w.semana_inicio)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedWeek === w.semana_inicio
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
            >
              {formatWeekLabel(w.semana_inicio)}
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Investido" value={formatMoney(kpis.investimento)} accent="sky" />
        <MetricCard
          label="Vendas"
          value={kpis.vendasDisponivel ? (kpis.vendas ?? 0).toLocaleString("pt-BR") : "—"}
          hint={kpis.vendasDisponivel ? undefined : "sem rastreamento configurado"}
          accent="sky"
        />
        <MetricCard label="CPA" value={kpis.cpa != null ? formatMoney(kpis.cpa) : "—"} accent="sky" />
        <MetricCard label="CTR" value={kpis.ctr != null ? `${kpis.ctr.toFixed(2)}%` : "—"} accent="sky" />
        <MetricCard label="CPM" value={kpis.cpm != null ? formatMoney(kpis.cpm) : "—"} accent="sky" />
        <MetricCard label="CPC" value={kpis.cpc != null ? formatMoney(kpis.cpc) : "—"} accent="sky" />
      </div>

      <p className="mb-6 text-xs text-neutral-400">
        {kpis.alcance != null && <>Alcance {kpis.alcance.toLocaleString("pt-BR")} · </>}
        Impressões {kpis.impressoes.toLocaleString("pt-BR")} · Cliques {kpis.cliques.toLocaleString("pt-BR")}
      </p>

      {tab === "visao" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-100 p-4 lg:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Evolução semanal</p>
              <MetaWeeklyChart data={metaWeekly} />
            </div>
            <div className="rounded-xl border border-neutral-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Público por gênero</p>
              <MetaGenderChart data={metaDemographics.genero} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-100 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Investimento por criativo</p>
              <MetaAdsRanking ads={metaAds} />
            </div>
            <div className="rounded-xl border border-neutral-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Distribuição por idade</p>
              <MetaAgeSummaryList data={metaDemographics.idade} />
              <MetaAgeChart data={metaDemographics.idade} />
            </div>
          </div>
        </div>
      )}

      {tab === "criativos" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-100 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Investimento por criativo</p>
            <MetaAdsRanking ads={metaAds} />
          </div>
          <div className="rounded-xl border border-neutral-100 p-4">
            <MetaAdsTable ads={metaAds} />
          </div>
        </div>
      )}

      {tab === "publico" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-100 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Público por gênero</p>
            <MetaGenderChart data={metaDemographics.genero} />
          </div>
          <div className="rounded-xl border border-neutral-100 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Distribuição por idade</p>
            <MetaAgeSummaryList data={metaDemographics.idade} />
            <MetaAgeChart data={metaDemographics.idade} />
          </div>
        </div>
      )}
    </div>
  );
}
