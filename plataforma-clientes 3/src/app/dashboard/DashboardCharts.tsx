"use client";

import {
  ResponsiveContainer,
  ComposedChart,
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

export type MonthlyDemandStat = { month: string; label: string; total: number; concluidas: number };
export type StatusBreakdownItem = { status: string; label: string; count: number; color: string };
export type SaudeBreakdownItem = { saude: string; label: string; count: number; color: string };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-neutral-700">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-neutral-400">{label}</div>
  );
}

function PieLegend({ items }: { items: { label: string; count: number; color: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-neutral-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label} <span className="text-neutral-400">({it.count})</span>
        </li>
      ))}
    </ul>
  );
}

export function DemandasPorMesChart({ data }: { data: MonthlyDemandStat[] }) {
  if (data.length === 0) return <EmptyChart label="Sem demandas com prazo definido pra mostrar." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
          labelStyle={{ fontWeight: 600, color: "#292524" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="total" name="Total de demandas" fill="#f3701c" radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Line
          type="monotone"
          dataKey="concluidas"
          name="Concluídas"
          stroke="#4ade80"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#4ade80" }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: StatusBreakdownItem[] }) {
  if (data.length === 0) return <EmptyChart label="Sem demandas pra mostrar." />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={85} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.status} fill={d.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
      <PieLegend items={data} />
    </div>
  );
}

export function SaudePieChart({ data }: { data: SaudeBreakdownItem[] }) {
  if (data.length === 0) return <EmptyChart label="Sem campanhas ativas pra mostrar." />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={85} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.saude} fill={d.color} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
      <PieLegend items={data} />
    </div>
  );
}

export function DashboardCharts({
  monthlyStats,
  statusBreakdown,
  saudeBreakdown,
}: {
  monthlyStats: MonthlyDemandStat[];
  statusBreakdown: StatusBreakdownItem[];
  saudeBreakdown: SaudeBreakdownItem[];
}) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChartCard title="Demandas por mês (2026 em diante)">
          <DemandasPorMesChart data={monthlyStats} />
        </ChartCard>
      </div>
      <ChartCard title="Demandas por status">
        <StatusPieChart data={statusBreakdown} />
      </ChartCard>
      <div className="lg:col-span-3">
        <ChartCard title="Campanhas por saúde">
          <SaudePieChart data={saudeBreakdown} />
        </ChartCard>
      </div>
    </div>
  );
}
