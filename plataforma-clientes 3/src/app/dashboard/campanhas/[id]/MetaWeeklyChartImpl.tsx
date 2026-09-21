"use client";

import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import {
  ACCENT, AXIS_TICK, GRID, seriesColor, ChartTooltip, ChartEmpty, ChartLegend, ChartDataTable,
} from "@/components/charts/primitives";
import { formatMoney, formatCompact } from "@/lib/metricLanguage";
import type { MetaWeeklyStat } from "@/lib/data/metaAds";

function weekLabel(semanaInicio: string) {
  return new Date(semanaInicio + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* -------------------------------------------------------------------------
   EVOLUÇÃO SEMANAL — investimento (coluna) x resultados (área).
   As duas séries têm unidades diferentes (reais e contagem), então NÃO
   dividem eixo: os resultados entram como área indexada ao próprio
   máximo, e o valor real aparece no tooltip e na tabela. Eixo Y duplo é
   o erro de leitura mais comum em gráfico de mídia e ele não entra aqui.
   ------------------------------------------------------------------------- */
export function MetaWeeklyChart({ data }: { data: MetaWeeklyStat[] }) {
  if (data.length === 0) return <ChartEmpty label="Ainda sem histórico semanal sincronizado." />;

  const temVendas = data.some((d) => d.vendas != null);
  const maxVendas = Math.max(...data.map((d) => d.vendas ?? 0), 1);
  const maxInvest = Math.max(...data.map((d) => d.investimento ?? 0), 1);

  const chartData = data.map((d) => ({
    label: weekLabel(d.semana_inicio),
    investimento: d.investimento ?? 0,
    vendas: d.vendas ?? 0,
    // Série de resultados reescalada pro domínio do investimento, só pra
    // as duas curvas caberem no mesmo desenho. O número honesto continua
    // no tooltip e na tabela — a área aqui comunica FORMATO, não valor.
    vendasEscalada: temVendas ? ((d.vendas ?? 0) / maxVendas) * maxInvest : 0,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="meta-vendas-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(2)} stopOpacity={0.25} />
              <stop offset="100%" stopColor={seriesColor(2)} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis
            width={52}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--ink) / 0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as (typeof chartData)[number];
              return (
                <ChartTooltip
                  title={`Semana de ${label}`}
                  rows={[
                    { label: "Investido", value: formatMoney(row.investimento), color: ACCENT },
                    ...(temVendas
                      ? [{ label: "Resultados", value: formatCompact(row.vendas), color: seriesColor(2) }]
                      : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="investimento" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={480} />
          {temVendas && (
            <Area
              type="monotone"
              dataKey="vendasEscalada"
              stroke={seriesColor(2)}
              strokeWidth={2}
              fill="url(#meta-vendas-fill)"
              dot={{ r: 3, fill: seriesColor(2), strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              animationDuration={540}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLegend
        className="mt-2"
        items={[
          { label: "Investido", color: ACCENT },
          ...(temVendas ? [{ label: "Resultados (formato da curva)", color: seriesColor(2) }] : []),
        ]}
      />

      <ChartDataTable
        caption="Evolução semanal da campanha"
        columns={temVendas ? ["Semana", "Investido", "Resultados"] : ["Semana", "Investido"]}
        rows={data.map((d) =>
          temVendas
            ? [weekLabel(d.semana_inicio), formatMoney(d.investimento), formatCompact(d.vendas)]
            : [weekLabel(d.semana_inicio), formatMoney(d.investimento)]
        )}
      />
    </div>
  );
}

