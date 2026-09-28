"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import {
  ACCENT, AXIS_TICK, GRID, MUTED, ChartTooltip, ChartEmpty, ChartDataTable,
} from "@/components/charts/primitives";
import { Delta, Tabs } from "@/components/ui";
import { METRICS, formatByKey, formatCompact, formatMoney, type MetricKey } from "@/lib/metricLanguage";
import type { MetaWeeklyStat } from "@/lib/data/metaAds";

function weekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* -------------------------------------------------------------------------
   EVOLUÇÃO SEMANAL — uma métrica por vez, escolhida pelo usuário.

   A versão anterior desenhava investimento (barras, em reais) e
   resultados (área) no mesmo desenho, com a área "reescalada" ao máximo do
   investimento. O eixo Y dizia "2k" e valia só para uma das séries — a
   outra parecia ter 2 mil resultados onde havia 214. E semana sem
   rastreamento entrava como ZERO, o que desenhava uma queda que não
   aconteceu.

   Agora: uma série, um eixo, uma unidade. O seletor troca a pergunta
   ("quanto gastei?", "quanto voltou?", "a que custo?"), a semana de melhor
   marca vem destacada e a última semana é comparada com a anterior.
   Semana sem dado é lacuna, não zero.
   ------------------------------------------------------------------------- */

type Chave = "investimento" | "vendas" | "cpa" | "impressoes" | "ctr";

type Linha = {
  label: string;
  semana: string;
  investimento: number | null;
  vendas: number | null;
  cpa: number | null;
  impressoes: number | null;
  ctr: number | null;
};

// Barra para volume (soma no tempo), linha para taxa (não soma).
const FORMA: Record<Chave, "bar" | "line"> = {
  investimento: "bar",
  vendas: "bar",
  impressoes: "bar",
  cpa: "line",
  ctr: "line",
};

function eixo(chave: Chave, v: number): string {
  if (chave === "investimento" || chave === "cpa") return formatMoney(v, true).replace(",00", "");
  if (chave === "ctr") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return formatCompact(v);
}

export function MetaWeeklyChart({ data }: { data: MetaWeeklyStat[] }) {
  const linhas: Linha[] = useMemo(
    () =>
      data.map((d) => ({
        label: weekLabel(d.semana_inicio),
        semana: d.semana_inicio,
        investimento: d.investimento ?? null,
        vendas: d.vendas,
        cpa: d.vendas != null && d.vendas > 0 && d.investimento != null ? d.investimento / d.vendas : null,
        impressoes: d.impressoes ?? null,
        ctr: d.impressoes > 0 && d.cliques != null ? (d.cliques / d.impressoes) * 100 : null,
      })),
    [data]
  );

  const disponiveis = (["investimento", "vendas", "cpa", "impressoes", "ctr"] as Chave[]).filter((k) =>
    linhas.some((l) => l[k] != null && l[k]! > 0)
  );
  const [chave, setChave] = useState<Chave>("investimento");
  const ativa: Chave = disponiveis.includes(chave) ? chave : disponiveis[0] ?? "investimento";

  if (data.length === 0 || disponiveis.length === 0) {
    return <ChartEmpty label="Ainda sem histórico semanal sincronizado." />;
  }

  const def = METRICS[ativa as MetricKey];
  const menorMelhor = def.betterWhen === "lower";
  const comValor = linhas.filter((l) => l[ativa] != null);

  // Melhor semana: maior valor, ou menor quando a métrica é custo.
  const melhor = comValor.reduce<Linha | null>((m, l) => {
    if (!m) return l;
    return menorMelhor ? (l[ativa]! < m[ativa]! ? l : m) : l[ativa]! > m[ativa]! ? l : m;
  }, null);

  // Última semana contra a anterior, ambas com valor.
  const ultima = comValor[comValor.length - 1];
  const penultima = comValor[comValor.length - 2];
  const delta =
    ultima && penultima && penultima[ativa]! !== 0
      ? ((ultima[ativa]! - penultima[ativa]!) / Math.abs(penultima[ativa]!)) * 100
      : null;

  const rotuloMelhor =
    ativa === "investimento" ? "Semana de maior investimento" : menorMelhor ? "Semana mais barata" : "Melhor semana";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Chave>
          value={ativa}
          onChange={setChave}
          tabs={disponiveis.map((k) => ({ value: k, label: METRICS[k as MetricKey].label }))}
        />
        <p className="text-caption text-ink-3">{def.description}</p>
      </div>

      <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-2">
        {melhor && (
          <div>
            <dt className="font-mono text-label uppercase text-ink-3">{rotuloMelhor}</dt>
            <dd className="mt-0.5 text-small text-ink">
              <span className="font-medium tabular-nums">{formatByKey(ativa as MetricKey, melhor[ativa])}</span>
              <span className="text-ink-3"> · semana de {melhor.label}</span>
            </dd>
          </div>
        )}
        {ultima && penultima && (
          <div>
            <dt className="font-mono text-label uppercase text-ink-3">Última semana</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-small text-ink">
              <span className="font-medium tabular-nums">{formatByKey(ativa as MetricKey, ultima[ativa])}</span>
              <Delta value={delta} invert={menorMelhor} neutral={def.betterWhen === "neutral"} />
              <span className="text-caption text-ink-3">vs. semana anterior</span>
            </dd>
          </div>
        )}
      </dl>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={linhas} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis
            width={60}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => eixo(ativa, v)}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--ink) / 0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as Linha;
              return (
                <ChartTooltip
                  title={`Semana de ${label}`}
                  rows={[
                    { label: def.label, value: row[ativa] == null ? "sem dado" : formatByKey(ativa as MetricKey, row[ativa]), color: ACCENT },
                    ...(ativa !== "investimento"
                      ? [{ label: "Investido", value: formatByKey("investimento", row.investimento) }]
                      : []),
                  ]}
                />
              );
            }}
          />
          {FORMA[ativa] === "bar" ? (
            <Bar dataKey={ativa} radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={420}>
              {linhas.map((l) => (
                // Ênfase: a melhor semana na cor de marca, o resto recua.
                <Cell key={l.semana} fill={melhor && l.semana === melhor.semana ? ACCENT : MUTED} />
              ))}
            </Bar>
          ) : (
            <Line
              type="monotone"
              dataKey={ativa}
              stroke={ACCENT}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              animationDuration={420}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {comValor.length < linhas.length && (
        <p className="mt-2 text-caption text-ink-3">
          {linhas.length - comValor.length} {linhas.length - comValor.length === 1 ? "semana" : "semanas"} sem dado
          para esta métrica aparecem vazias — não como zero.
        </p>
      )}

      <ChartDataTable
        caption="Evolução semanal da campanha"
        columns={["Semana", "Investido", "Resultados", "Custo por resultado", "Exibições", "CTR"]}
        rows={linhas.map((l) => [
          l.label,
          formatByKey("investimento", l.investimento),
          formatByKey("vendas", l.vendas),
          formatByKey("cpa", l.cpa),
          formatByKey("impressoes", l.impressoes),
          formatByKey("ctr", l.ctr),
        ])}
      />
    </div>
  );
}
