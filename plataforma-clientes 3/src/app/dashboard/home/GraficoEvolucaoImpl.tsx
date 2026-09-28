"use client";

import { useMemo, useState } from "react";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { AXIS_TICK, ChartDataTable, ChartLegend, ChartTooltip, GRID, MUTED } from "@/components/charts/primitives";
import { Delta, Switch, Tabs } from "@/components/ui";
import { METRICS, formatByKey, formatCompact, formatMoney, type MetricKey } from "@/lib/metricLanguage";
import type { MetricaSerie } from "@/lib/home";
import { COR_KPI, type CorKpi } from "./KpiCard";

/* =========================================================================
   GRÁFICO PRINCIPAL DA HOME — evolução semana a semana
   -------------------------------------------------------------------------
   Uma série por vez, um eixo, uma unidade: o seletor troca a pergunta
   (quanto foi investido, quantos resultados, a que custo). A cor da série
   é a mesma do KPI daquela métrica, então o olho liga o cartão ao gráfico
   sem legenda.

   A comparação com o período anterior é OPCIONAL e vem em cinza — a forma
   de ênfase: o período atual é o assunto, o anterior é contexto. Ela é
   por posição (1ª semana contra 1ª semana), e o gráfico diz isso.
   ========================================================================= */

export type Valores = Record<MetricaSerie, number | null>;

export type PontoGrafico = {
  semanaInicio: string;
  semanaFim: string;
  atual: Valores;
  anterior: Valores | null;
  anteriorInicio: string | null;
};

const COR_DA_METRICA: Record<MetricaSerie, CorKpi> = {
  investimento: "investimento",
  vendas: "resultados",
  cpa: "custo",
  impressoes: "impressoes",
  cliques: "cliques",
  ctr: "ctr",
};

// Volume soma no tempo; taxa não — o resumo de uma taxa é a razão dos
// totais, não a soma das semanas.
const E_TAXA: Record<MetricaSerie, boolean> = {
  investimento: false,
  vendas: false,
  impressoes: false,
  cliques: false,
  cpa: true,
  ctr: true,
};

const MAIOR_E_MELHOR: Record<MetricaSerie, boolean | null> = {
  investimento: null,
  vendas: true,
  impressoes: true,
  cliques: true,
  cpa: false,
  ctr: true,
};

function dataCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function eixo(m: MetricaSerie, v: number): string {
  if (m === "investimento" || m === "cpa") return formatMoney(v, true).replace(/,00$/, "");
  if (m === "ctr") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return formatCompact(v);
}

/** Total (ou taxa) de um conjunto de semanas para uma métrica. */
function resumo(pts: (Valores | null)[], m: MetricaSerie): number | null {
  const vs = pts.filter((p): p is Valores => p != null);
  const soma = (k: MetricaSerie) => {
    const presentes = vs.map((p) => p[k]).filter((x): x is number => x != null);
    return presentes.length ? presentes.reduce((t, x) => t + x, 0) : null;
  };
  if (m === "cpa") {
    const comVenda = vs.filter((p) => p.vendas != null && p.vendas > 0);
    const inv = comVenda.reduce((t, p) => t + (p.investimento ?? 0), 0);
    const ven = comVenda.reduce((t, p) => t + (p.vendas ?? 0), 0);
    return ven > 0 ? inv / ven : null;
  }
  if (m === "ctr") {
    const com = vs.filter((p) => p.impressoes != null && p.impressoes > 0 && p.cliques != null);
    const imp = com.reduce((t, p) => t + (p.impressoes ?? 0), 0);
    const cli = com.reduce((t, p) => t + (p.cliques ?? 0), 0);
    return imp > 0 ? (cli / imp) * 100 : null;
  }
  return soma(m);
}

export function GraficoEvolucao({
  pontos,
  metricas,
  rotuloAnterior,
}: {
  pontos: PontoGrafico[];
  metricas: MetricaSerie[];
  /** "3 meses anteriores" — null em "Tudo". */
  rotuloAnterior: string | null;
}) {
  const [escolhida, setEscolhida] = useState<MetricaSerie>(metricas.includes("vendas") ? "vendas" : metricas[0]);
  const m = metricas.includes(escolhida) ? escolhida : metricas[0];
  const temAnterior = rotuloAnterior != null && pontos.some((p) => p.anterior?.[m] != null);
  const [comparar, setComparar] = useState(true);
  const mostrarAnterior = temAnterior && comparar;

  const def = METRICS[m as MetricKey];
  const cor = `rgb(var(${COR_KPI[COR_DA_METRICA[m]]}))`;

  const dados = useMemo(
    () =>
      pontos.map((p) => ({
        rotulo: dataCurta(p.semanaInicio),
        atual: p.atual[m],
        anterior: p.anterior?.[m] ?? null,
        p,
      })),
    [pontos, m]
  );

  // Melhor semana do período atual, pela direção da métrica.
  const melhor = useMemo(() => {
    const dir = MAIOR_E_MELHOR[m];
    const com = dados.filter((d) => d.atual != null);
    if (com.length < 2) return null;
    return com.reduce((a, b) => {
      if (dir === false) return b.atual! < a.atual! ? b : a;
      return b.atual! > a.atual! ? b : a;
    });
  }, [dados, m]);

  const totalAtual = resumo(pontos.map((p) => p.atual), m);
  // A comparação usa só as semanas que têm par — somar o período anterior
  // inteiro contra um atual mais curto inventaria uma queda.
  const pares = pontos.filter((p) => p.anterior != null);
  const totalAtualPareado = resumo(pares.map((p) => p.atual), m);
  const totalAnterior = resumo(pares.map((p) => p.anterior), m);
  const delta =
    temAnterior && totalAtualPareado != null && totalAnterior != null && totalAnterior !== 0
      ? ((totalAtualPareado - totalAnterior) / Math.abs(totalAnterior)) * 100
      : null;

  const semanasSemDado = dados.filter((d) => d.atual == null).length;

  return (
    <div>
      {/* Controles: métrica à esquerda, comparação à direita. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<MetricaSerie>
          value={m}
          onChange={setEscolhida}
          tabs={metricas.map((k) => ({
            value: k,
            label: METRICS[k as MetricKey].label,
            icon: (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `rgb(var(${COR_KPI[COR_DA_METRICA[k]]}))` }}
              />
            ),
          }))}
        />
        {temAnterior && (
          <Switch
            size="sm"
            checked={comparar}
            onCheckedChange={setComparar}
            label={`Comparar com os ${rotuloAnterior}`}
          />
        )}
      </div>

      {/* Resumo da métrica escolhida. */}
      <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="font-mono text-label uppercase text-ink-3">
            {/* Custo e CTR aqui saem só das semanas com o dado — por isso o
                rótulo diz isso, e não "no período": o KPI lá em cima usa o
                total das campanhas e pode dar outro número. */}
            {m === "cpa"
              ? "Nas semanas com resultado"
              : m === "ctr"
                ? "Nas semanas com exibição"
                : `Total nas ${pontos.length} semanas`}
          </p>
          <p className="mt-1 text-[1.625rem] font-semibold leading-none tracking-[-0.02em] text-ink">
            {formatByKey(m as MetricKey, totalAtual)}
          </p>
        </div>
        {/* A comparação mostra os DOIS lados do que compara. Só o anterior
            ao lado do total fazia "189" e "↘ 8%" parecerem contraditórios:
            a seta era das semanas pareadas, não do total. */}
        {mostrarAnterior && totalAnterior != null && totalAtualPareado != null && (
          <div>
            <p className="font-mono text-label uppercase text-ink-3">
              {pares.length === pontos.length
                ? "Atual × anterior"
                : `${pares.length} primeiras semanas: atual × anterior`}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-body font-medium tabular-nums text-ink">{formatByKey(m as MetricKey, totalAtualPareado)}</span>
              <span className="text-caption text-ink-3">×</span>
              <span className="text-body tabular-nums text-ink-2">{formatByKey(m as MetricKey, totalAnterior)}</span>
              <Delta value={delta} invert={MAIOR_E_MELHOR[m] === false} neutral={MAIOR_E_MELHOR[m] === null} />
            </p>
          </div>
        )}
        {melhor && (
          <div>
            <p className="font-mono text-label uppercase text-ink-3">
              {MAIOR_E_MELHOR[m] === null ? "Semana de maior valor" : MAIOR_E_MELHOR[m] ? "Melhor semana" : "Semana mais barata"}
            </p>
            <p className="mt-1 text-body text-ink-2">
              <span className="font-medium tabular-nums text-ink">{formatByKey(m as MetricKey, melhor.atual)}</span>
              <span className="text-ink-3"> · {melhor.rotulo}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="home-evolucao-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.16} />
                <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="rotulo"
              tick={AXIS_TICK}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              dy={6}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              width={64}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => eixo(m, v)}
              domain={[0, "auto"]}
            />
            <RTooltip
              cursor={{ stroke: "rgb(var(--line-strong))", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as (typeof dados)[number];
                return (
                  <ChartTooltip
                    title={`Semana de ${dataCurta(d.p.semanaInicio)} a ${dataCurta(d.p.semanaFim)}`}
                    rows={[
                      { label: def.label, value: d.atual == null ? "sem dado" : formatByKey(m as MetricKey, d.atual), color: cor },
                      ...(mostrarAnterior
                        ? [
                            {
                              label: d.p.anteriorInicio ? `Anterior (sem. de ${dataCurta(d.p.anteriorInicio)})` : "Anterior",
                              value: d.anterior == null ? "sem dado" : formatByKey(m as MetricKey, d.anterior),
                              color: MUTED,
                            },
                          ]
                        : []),
                      ...(m !== "investimento"
                        ? [{ label: "Investido na semana", value: formatByKey("investimento", d.p.atual.investimento) }]
                        : []),
                    ]}
                  />
                );
              }}
            />
            {mostrarAnterior && (
              <Line
                type="monotone"
                dataKey="anterior"
                stroke={MUTED}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: MUTED, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="atual"
              stroke={cor}
              strokeWidth={2}
              fill="url(#home-evolucao-area)"
              connectNulls={false}
              dot={{ r: 3, fill: cor, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: cor, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              animationDuration={500}
            />
            {melhor && (
              <ReferenceDot
                x={melhor.rotulo}
                y={melhor.atual!}
                r={6}
                fill={cor}
                stroke="rgb(var(--surface))"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {mostrarAnterior ? (
          <ChartLegend
            items={[
              { label: "Período atual", color: cor },
              { label: `${rotuloAnterior!.charAt(0).toUpperCase()}${rotuloAnterior!.slice(1)}, semana a semana`, color: MUTED },
            ]}
          />
        ) : (
          <span />
        )}
        <p className="text-caption text-ink-3">
          {semanasSemDado > 0
            ? `${semanasSemDado} ${semanasSemDado === 1 ? "semana sem dado aparece" : "semanas sem dado aparecem"} como lacuna, não como zero.`
            : "Mídia paga do Meta Ads, somada semana a semana."}
        </p>
      </div>

      <ChartDataTable
        caption={`Evolução semanal — ${def.label}`}
        columns={mostrarAnterior ? ["Semana", def.label, "Período anterior"] : ["Semana", def.label]}
        rows={dados.map((d) =>
          mostrarAnterior
            ? [d.rotulo, formatByKey(m as MetricKey, d.atual), formatByKey(m as MetricKey, d.anterior)]
            : [d.rotulo, formatByKey(m as MetricKey, d.atual)]
        )}
      />
    </div>
  );
}
