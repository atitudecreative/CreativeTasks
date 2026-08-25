"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { MetaWeeklyStat, MetaDemographicItem } from "@/lib/data/metaAds";

const GENDER_COLORS: Record<string, string> = {
  female: "#d4a373",
  male: "rgb(var(--brand-500))",
  unknown: "#a8a29e",
};

const GENDER_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  unknown: "Não informado",
};

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-56 items-center justify-center text-sm text-neutral-400">{label}</div>;
}

// Investido x vendas por semana — mesma ideia do relatório de agência
// (barra = investido, linha = vendas). Some vendas ficarem null quando o
// Pixel/Conversions API não está configurado — nesse caso só mostra a
// barra de investido.
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
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
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
          contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
          formatter={(value, name) =>
            name === "Investido"
              ? [Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), name]
              : [value, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="investimento" name="Investido" fill="rgb(var(--brand-500))" radius={[6, 6, 0, 0]} maxBarSize={40} />
        {temVendas && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="vendas"
            name="Vendas"
            stroke="#d4a373"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#d4a373" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
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
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} dataKey="investimento" nameKey="label" innerRadius={50} outerRadius={85} paddingAngle={2}>
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
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="chave" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#78716c" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
          formatter={(value, name) =>
            name === "Investido"
              ? [Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), name]
              : [value, name]
          }
        />
        <Bar dataKey="investimento" name="Investido" fill="rgb(var(--brand-500))" radius={[6, 6, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  );
}
