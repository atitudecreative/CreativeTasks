"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { STATUS_LABEL } from "@/lib/demandOptions";
import { deriveMetaKpis } from "@/lib/metaAdsMath";
import type { MetaMetricsSummary } from "@/lib/metaAdsMath";
import type { Milestone } from "@/lib/data/campaigns";
import type { MetaAdCampaign, MetaAd, MetaWeeklyStat, MetaDemographicItem } from "@/lib/data/metaAds";
import type { StatusBreakdownItem } from "@/lib/data/demands";
import type { Deliverable } from "@/lib/data/deliverables";
import { DeliverableCard } from "@/components/DeliverableCard";
import { StatusPieChart } from "../../DashboardCharts";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { MetaWeeklyChart, MetaGenderChart, MetaAgeChart, MetaAdsRanking, MetaAgeSummaryList } from "./MetaAdsCharts";
import { MetaAdsTable } from "./MetaAdsTable";
import {
  IconListChecks,
  IconCheckCircle,
  IconTrendingUp,
  IconWallet,
  IconTarget,
  IconLayers,
  IconCalendar,
  IconDownload,
  IconPrinter,
} from "./icons";

type PageTab = "visao" | "demandas" | "marcos" | "metaads";

export type DemandListItem = {
  id: string;
  titulo: string;
  status: string;
  prazo_acordado: string | null;
  overdue: boolean;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "não definido";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWeekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function downloadAdsCsv(ads: MetaAd[], campaignNome: string) {
  const header = ["Criativo", "Investido", "Impressões", "Cliques", "CTR", "CPC", "CPM", "Vendas"];
  const lines = ads.map((ad) =>
    [ad.nome, ad.investimento ?? "", ad.impressoes ?? "", ad.cliques ?? "", ad.ctr ?? "", ad.cpc ?? "", ad.cpm ?? "", ad.vendas ?? ""]
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

// Painel padrão — mesma borda/raio/padding em todo lugar, pra tudo
// alinhar num grid sem sobras de espaço diferentes entre um card e outro.
function Panel({ title, right, className = "", children }: { title?: string; right?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{title}</p>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function CampaignDashboardTabs({
  campaignNome,
  objetivoEstrategico,
  escopoMacro,
  dataInicio,
  dataTermino,
  orcamentoPlanejado,
  orcamentoAprovado,
  resultadosObservacoes,
  resumoDemandas,
  statusBreakdown,
  demandasOrdenadas,
  progress,
  proximoMarco,
  milestones,
  deliverables,
  canApprove,
  metaCampaigns,
  metaMetrics,
  metaWeekly,
  metaDemographics,
  metaAds,
}: {
  campaignNome: string;
  objetivoEstrategico: string | null | undefined;
  escopoMacro: string | null | undefined;
  dataInicio: string | null;
  dataTermino: string | null;
  orcamentoPlanejado: number | null;
  orcamentoAprovado: number | null;
  resultadosObservacoes: string | null | undefined;
  resumoDemandas: { total: number; concluidas: number; atrasadas: number; abertas: number };
  statusBreakdown: StatusBreakdownItem[];
  demandasOrdenadas: DemandListItem[];
  progress: number | null;
  proximoMarco: Milestone | undefined;
  milestones: Milestone[];
  deliverables: Deliverable[];
  canApprove: boolean;
  metaCampaigns: MetaAdCampaign[];
  metaMetrics: MetaMetricsSummary;
  metaWeekly: MetaWeeklyStat[];
  metaDemographics: { genero: MetaDemographicItem[]; idade: MetaDemographicItem[] };
  metaAds: MetaAd[];
}) {
  const hasMeta = metaCampaigns.length > 0;
  const [tab, setTab] = useState<PageTab>("visao");
  const [selectedWeek, setSelectedWeek] = useState<string>("total");

  const weekKpis = useMemo(() => {
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

  const tabs: [PageTab, string][] = [
    ["visao", "Visão geral"],
    ["demandas", "Demandas"],
    ["marcos", "Marcos"],
    ...(hasMeta ? ([["metaads", "Meta Ads"]] as [PageTab, string][]) : []),
  ];

  const temSobreEvento = Boolean(objetivoEstrategico || escopoMacro || dataInicio || dataTermino || orcamentoPlanejado || orcamentoAprovado);

  return (
    <div>
      {/* Ações globais */}
      <div className="mb-3 flex items-center justify-end gap-2">
        {hasMeta && (
          <button
            type="button"
            onClick={() => downloadAdsCsv(metaAds, campaignNome)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-700 hover:shadow"
        >
          <IconPrinter className="h-3.5 w-3.5" />
          Imprimir / PDF
        </button>
      </div>

      {/* KPIs unificados — demandas + Meta Ads no mesmo grid, sempre "todo
          o período" (o filtro de semana fica só dentro da aba Meta Ads). */}
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        <MetricCard label="Demandas" value={resumoDemandas.total} accent="brand" icon={<IconListChecks className="h-4 w-4" />} />
        <MetricCard label="Concluídas" value={resumoDemandas.concluidas} accent="green" icon={<IconCheckCircle className="h-4 w-4" />} />
        {!hasMeta && (
          <MetricCard label="Em andamento" value={resumoDemandas.abertas} accent="walnut" icon={<IconTrendingUp className="h-4 w-4" />} />
        )}
        {hasMeta && (
          <>
            <MetricCard label="Investido" value={formatMoney(metaMetrics.investimento)} accent="brand" icon={<IconWallet className="h-4 w-4" />} />
            <MetricCard
              label="Vendas"
              value={metaMetrics.vendasDisponivel ? (metaMetrics.vendas ?? 0).toLocaleString("pt-BR") : "—"}
              accent="green"
              icon={<IconCheckCircle className="h-4 w-4" />}
            />
            <MetricCard label="CPA" value={metaMetrics.cpa != null ? formatMoney(metaMetrics.cpa) : "—"} accent="amber" icon={<IconTarget className="h-4 w-4" />} />
            <MetricCard label="CTR" value={metaMetrics.ctr != null ? `${metaMetrics.ctr.toFixed(2)}%` : "—"} accent="walnut" />
            <MetricCard label="CPM" value={metaMetrics.cpm != null ? formatMoney(metaMetrics.cpm) : "—"} accent="walnut" />
          </>
        )}
      </div>

      {/* Abas — páginas do dashboard, não uma rolagem só */}
      <div className="mb-4 inline-flex rounded-full bg-neutral-100 p-1">
        {tabs.map(([key, label]) => (
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

      {tab === "visao" &&
        (hasMeta ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Panel title="Evolução semanal" className="lg:col-span-2">
                <MetaWeeklyChart data={metaWeekly} />
              </Panel>
              <Panel title="Público por gênero">
                <MetaGenderChart data={metaDemographics.genero} />
              </Panel>
            </div>
            <Panel title="Investimento por criativo">
              <MetaAdsRanking ads={metaAds} />
            </Panel>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Demandas por status" className="lg:col-span-1">
              <StatusPieChart data={statusBreakdown} />
            </Panel>
            <Panel title="Marcos e progresso" className="lg:col-span-2">
              {progress !== null ? (
                <>
                  <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-neutral-500">{progress}% concluído</p>
                  {proximoMarco && <p className="mt-1 text-xs text-neutral-500">Próximo marco: {proximoMarco.nome}</p>}
                </>
              ) : (
                <p className="text-sm text-neutral-400">Sem marcos definidos pra essa campanha ainda.</p>
              )}
            </Panel>
          </div>
        ))}

      {tab === "demandas" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Por status">
            <StatusPieChart data={statusBreakdown} />
          </Panel>
          <Panel title={`Demandas vinculadas (${demandasOrdenadas.length})`} className="lg:col-span-2">
            {demandasOrdenadas.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhuma demanda vinculada a esta campanha ainda.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto">
                {demandasOrdenadas.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 border-b border-neutral-50 pb-2 text-sm last:border-0">
                    <Link href={`/dashboard/demandas/${d.id}`} className="min-w-0 truncate font-medium text-neutral-800 hover:underline">
                      {d.titulo}
                    </Link>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {d.overdue && <span className="mr-1.5 font-medium text-rose-600">atrasada ·</span>}
                      {STATUS_LABEL[d.status] ?? d.status}
                      {d.prazo_acordado && ` · ${formatDate(d.prazo_acordado)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "marcos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel
              title="Marcos e progresso"
              right={progress !== null ? <span className="text-xs font-semibold text-neutral-700">{progress}%</span> : undefined}
              className="lg:col-span-1"
            >
              {progress !== null && (
                <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
                </div>
              )}
              {proximoMarco && <p className="mb-3 mt-2 text-xs text-neutral-500">Próximo marco: {proximoMarco.nome}</p>}
              {milestones.length > 0 ? (
                <div className={progress !== null ? "mt-3 border-t border-neutral-100 pt-3" : ""}>
                  <MilestoneTimeline milestones={milestones} />
                </div>
              ) : (
                progress === null && <p className="text-sm text-neutral-400">Sem marcos definidos ainda.</p>
              )}
            </Panel>

            {temSobreEvento && (
              <Panel title="Sobre o evento" className="lg:col-span-2">
                <div className="space-y-4">
                  {objetivoEstrategico && (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconTarget className="h-3.5 w-3.5" /> Objetivo estratégico
                      </p>
                      <p className="text-sm text-neutral-800">{objetivoEstrategico}</p>
                    </div>
                  )}
                  {escopoMacro && (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconLayers className="h-3.5 w-3.5" /> Escopo macro
                      </p>
                      <p className="text-sm text-neutral-800">{escopoMacro}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3 sm:grid-cols-4">
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconCalendar className="h-3.5 w-3.5" /> Início
                      </p>
                      <p className="text-sm text-neutral-800">{formatDate(dataInicio)}</p>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconCalendar className="h-3.5 w-3.5" /> Término
                      </p>
                      <p className="text-sm text-neutral-800">{formatDate(dataTermino)}</p>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconWallet className="h-3.5 w-3.5" /> Planejado
                      </p>
                      <p className="text-sm text-neutral-800">{formatMoney(orcamentoPlanejado)}</p>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <IconWallet className="h-3.5 w-3.5" /> Aprovado
                      </p>
                      <p className="text-sm text-neutral-800">{formatMoney(orcamentoAprovado)}</p>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>

          {deliverables.length > 0 && (
            <Panel title={`Entregas dessa campanha (${deliverables.length})`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {deliverables.map((d) => (
                  <DeliverableCard key={d.id} deliverable={d} canApprove={canApprove} />
                ))}
              </div>
            </Panel>
          )}

          {resultadosObservacoes && (
            <Panel title="Resultados e observações">
              <p className="text-sm text-neutral-800">{resultadosObservacoes}</p>
            </Panel>
          )}
        </div>
      )}

      {tab === "metaads" && hasMeta && (
        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <MetricCard label="Investido" value={formatMoney(weekKpis.investimento)} accent="brand" />
            <MetricCard
              label="Vendas"
              value={weekKpis.vendasDisponivel ? (weekKpis.vendas ?? 0).toLocaleString("pt-BR") : "—"}
              accent="green"
            />
            <MetricCard label="CPA" value={weekKpis.cpa != null ? formatMoney(weekKpis.cpa) : "—"} accent="amber" />
            <MetricCard label="CTR" value={weekKpis.ctr != null ? `${weekKpis.ctr.toFixed(2)}%` : "—"} accent="walnut" />
            <MetricCard label="CPM" value={weekKpis.cpm != null ? formatMoney(weekKpis.cpm) : "—"} accent="walnut" />
            <MetricCard label="CPC" value={weekKpis.cpc != null ? formatMoney(weekKpis.cpc) : "—"} accent="walnut" />
          </div>

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

          <Panel title="Investimento por criativo">
            <MetaAdsRanking ads={metaAds} />
          </Panel>

          <Panel title={`Tabela completa (${metaAds.length})`}>
            <MetaAdsTable ads={metaAds} />
          </Panel>
        </div>
      )}
    </div>
  );
}
