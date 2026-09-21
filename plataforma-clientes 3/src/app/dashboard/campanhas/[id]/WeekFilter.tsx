"use client";

import { useMemo, useState } from "react";
import { Metric, MetricRow, Panel, Tooltip, cn } from "@/components/ui";
import { deriveMetaKpis, type MetaMetricsSummary } from "@/lib/metaAdsMath";
import { METRICS, formatMoney, formatCompact, percentChange } from "@/lib/metricLanguage";
import type { MetaWeeklyStat } from "@/lib/data/metaAds";

/* =========================================================================
   DESEMPENHO POR PERÍODO
   -------------------------------------------------------------------------
   O filtro de semana já existia; o que faltava era a COMPARAÇÃO. Um
   número de semana sozinho não diz se foi bom — só ganha sentido contra a
   semana anterior. Aqui, ao escolher uma semana, cada indicador mostra a
   variação contra a semana imediatamente anterior, com o sinal invertido
   nas métricas de custo (CPC/CPM/custo por resultado subirem é ruim).

   Os cálculos são refeitos no cliente a partir dos dados já carregados —
   nenhuma consulta nova ao banco, igual antes.
   ========================================================================= */

function weekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function kpisOfWeek(w: MetaWeeklyStat) {
  return {
    investimento: w.investimento,
    impressoes: w.impressoes,
    cliques: w.cliques,
    vendas: w.vendas,
    ...deriveMetaKpis({ investimento: w.investimento, impressoes: w.impressoes, cliques: w.cliques, vendas: w.vendas }),
  };
}

export function WeekPerformance({
  total,
  weekly,
}: {
  total: MetaMetricsSummary;
  weekly: MetaWeeklyStat[];
}) {
  const [selected, setSelected] = useState<string>("total");

  const { current, previous, periodLabel } = useMemo(() => {
    if (selected === "total" || weekly.length === 0) {
      return {
        current: {
          investimento: total.investimento,
          impressoes: total.impressoes,
          cliques: total.cliques,
          vendas: total.vendas,
          ctr: total.ctr,
          cpc: total.cpc,
          cpm: total.cpm,
          cpa: total.cpa,
        },
        previous: null,
        periodLabel: "Todo o período da campanha",
      };
    }
    const i = weekly.findIndex((w) => w.semana_inicio === selected);
    if (i < 0) return { current: null, previous: null, periodLabel: "" };
    return {
      current: kpisOfWeek(weekly[i]),
      previous: i > 0 ? kpisOfWeek(weekly[i - 1]) : null,
      periodLabel: `Semana de ${weekLabel(weekly[i].semana_inicio)}`,
    };
  }, [selected, total, weekly]);

  if (!current) return null;

  const items = [
    { key: "investimento" as const, value: formatMoney(current.investimento, true), raw: current.investimento },
    {
      key: "vendas" as const,
      value: total.vendasDisponivel ? formatCompact(current.vendas) : "—",
      raw: current.vendas,
    },
    { key: "cpa" as const, value: formatMoney(current.cpa), raw: current.cpa },
    { key: "ctr" as const, value: current.ctr != null ? `${current.ctr.toFixed(2)}%` : "—", raw: current.ctr },
    { key: "cpc" as const, value: formatMoney(current.cpc), raw: current.cpc },
    { key: "cpm" as const, value: formatMoney(current.cpm), raw: current.cpm },
  ];

  return (
    <Panel
      title="Desempenho da mídia"
      description={periodLabel}
      action={
        weekly.length > 0 && (
          <div className="flex max-w-full items-center gap-1 overflow-x-auto">
            <PeriodChip active={selected === "total"} onClick={() => setSelected("total")}>
              Todo o período
            </PeriodChip>
            {weekly.map((w) => (
              <PeriodChip
                key={w.semana_inicio}
                active={selected === w.semana_inicio}
                onClick={() => setSelected(w.semana_inicio)}
              >
                {weekLabel(w.semana_inicio)}
              </PeriodChip>
            ))}
          </div>
        )
      }
    >
      <MetricRow columns={6}>
        {items.map((item) => {
          const def = METRICS[item.key];
          const prevRaw = previous ? (previous[item.key as keyof typeof previous] as number | null) : null;
          return (
            <Metric
              key={item.key}
              size="compact"
              label={def.label}
              value={
                <Tooltip content={`${def.plainLabel} — ${def.description}`} side="bottom">
                  <span className="cursor-help">{item.value}</span>
                </Tooltip>
              }
              delta={previous ? percentChange(item.raw ?? null, prevRaw) : null}
              deltaInvert={def.betterWhen === "lower"}
              deltaLabel={previous ? "vs. semana anterior" : undefined}
            />
          );
        })}
      </MetricRow>
    </Panel>
  );
}

function PeriodChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.625rem] tabular-nums transition duration-120",
        active
          ? "border-ink bg-ink text-ink-inverse"
          : "border-line-strong text-ink-3 hover:border-ink-3/50 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
