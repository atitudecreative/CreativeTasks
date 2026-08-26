"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Sector,
  Cell,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import type { MetaWeeklyStat, MetaDemographicItem, MetaAd } from "@/lib/data/metaAds";

// Cores puxadas da identidade visual da própria plataforma (variáveis
// CSS de brand/walnut, que mudam por ministério — ver tailwind.config.ts)
// em vez de tons fixos desconectados do resto do portal.
const GENDER_COLORS: Record<string, string> = {
  female: "rgb(var(--walnut-400))",
  male: "rgb(var(--brand-500))",
  unknown: "#a8a29e",
};

const GENDER_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  unknown: "Não informado",
};

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

// Fundo por trás do plot — mesmo tratamento em todo gráfico (linha,
// coluna, pizza), pra dar mais contraste contra o card branco.
function ChartBackdrop({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-neutral-50 p-2">{children}</div>;
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-56 items-center justify-center text-sm text-neutral-400">{label}</div>;
}

// Investido x vendas por semana — barra = investido, área preenchida =
// vendas (em vez de só uma linha fina, a área embaixo da linha vem
// pintada com um degradê, pra ficar mais fácil de ler a tendência).
// Some vendas ficarem null quando o Pixel/Conversions API não está
// configurado — nesse caso só mostra a barra de investido.
export function MetaWeeklyChart({ data }: { data: MetaWeeklyStat[] }) {
  if (data.length === 0) return <EmptyChart label="Ainda sem histórico semanal sincronizado." />;

  const temVendas = data.some((d) => d.vendas != null);
  const chartData = data.map((d) => ({
    label: new Date(d.semana_inicio + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    investimento: d.investimento,
    vendas: d.vendas,
  }));

  return (
    <ChartBackdrop>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="areaVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--walnut-400))" stopOpacity={0.55} />
              <stop offset="100%" stopColor="rgb(var(--walnut-400))" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#d6d3d1" }} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
          />
          {temVendas && (
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
          )}
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.045)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
            formatter={(value, name) =>
              name === "Investido"
                ? [Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), name]
                : [value, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="investimento"
            name="Investido"
            fill="rgb(var(--brand-500))"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            animationDuration={500}
          />
          {temVendas && (
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="vendas"
              name="Vendas"
              stroke="rgb(var(--walnut-500))"
              strokeWidth={2.5}
              fill="url(#areaVendas)"
              dot={{ r: 4, fill: "rgb(var(--walnut-500))", strokeWidth: 0 }}
              activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
              animationDuration={600}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartBackdrop>
  );
}

// Fatia "estourando" um pouco pra fora quando o mouse passa em cima —
// dá a sensação de resposta/animação que gráfico estático não tem.
function ActiveSlice(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={(outerRadius ?? 0) + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

export function MetaGenderChart({ data }: { data: MetaDemographicItem[] }) {
  if (data.length === 0) return <EmptyChart label="Ainda sem dados de público sincronizados." />;

  const chartData = data.map((d) => ({
    ...d,
    label: GENDER_LABEL[d.chave] ?? d.chave,
    color: GENDER_COLORS[d.chave] ?? "#a8a29e",
  }));

  return (
    <div>
      <ChartBackdrop>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="investimento"
              nameKey="label"
              innerRadius={50}
              outerRadius={82}
              paddingAngle={2}
              activeShape={ActiveSlice}
              animationDuration={500}
            >
              {chartData.map((d) => (
                <Cell key={d.chave} fill={d.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
              formatter={(value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartBackdrop>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {chartData.map((d) => (
          <li key={d.chave} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
            {d.vendas != null && <span className="text-neutral-400"> · {d.vendas} vendas</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Ranking de investimento por criativo (anúncio) — barra horizontal,
// maior investimento primeiro, com uma medalha no #1. Igual à ideia do
// "Investimento por Criativo" do exemplo, com as cores da plataforma.
export function MetaAdsRanking({ ads }: { ads: MetaAd[] }) {
  const ranked = [...ads]
    .filter((a) => a.investimento != null && a.investimento > 0)
    .sort((a, b) => (b.investimento ?? 0) - (a.investimento ?? 0));

  if (ranked.length === 0) return <EmptyChart label="Ainda sem investimento por criativo sincronizado." />;

  const max = ranked[0].investimento ?? 1;

  return (
    <div className="space-y-2.5">
      {ranked.map((ad, i) => (
        <div key={ad.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 truncate font-medium text-neutral-700">
              {i === 0 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  Top #1
                </span>
              )}
              <span className="truncate">{ad.nome}</span>
            </span>
            <span className="shrink-0 font-semibold text-neutral-800">{formatMoney(ad.investimento ?? 0)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.max(((ad.investimento ?? 0) / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Resumo por faixa etária em barras horizontais (investido x vendas),
// igual ao "35-44 anos (Público Principal)" do exemplo — a faixa com
// mais investimento leva a etiqueta "Público Principal".
export function MetaAgeSummaryList({ data }: { data: MetaDemographicItem[] }) {
  if (data.length === 0) return null;

  const ranked = [...data].sort((a, b) => b.investimento - a.investimento);
  const max = ranked[0]?.investimento || 1;

  return (
    <div className="mb-4 space-y-3">
      {ranked.map((d, i) => (
        <div key={d.chave}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-neutral-700">
              {d.chave} anos {i === 0 && <span className="text-neutral-400">(público principal)</span>}
            </span>
            <span className="text-neutral-500">
              {d.vendas != null ? `${d.vendas} vendas · ` : ""}
              {formatMoney(d.investimento)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.max((d.investimento / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetaAgeChart({ data }: { data: MetaDemographicItem[] }) {
  if (data.length === 0) return <EmptyChart label="Ainda sem dados de público sincronizados." />;

  const chartData = [...data].sort((a, b) => {
    const ia = AGE_ORDER.indexOf(a.chave);
    const ib = AGE_ORDER.indexOf(b.chave);
    if (ia === -1 && ib === -1) return a.chave.localeCompare(b.chave);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <ChartBackdrop>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="chave" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#d6d3d1" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.045)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
            formatter={(value, name) =>
              name === "Investido"
                ? [Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), name]
                : [value, name]
            }
          />
          <Bar dataKey="investimento" name="Investido" fill="rgb(var(--brand-500))" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </ChartBackdrop>
  );
}
