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
  Sector,
  Cell,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

export type MonthlyDemandStat = { month: string; label: string; total: number; concluidas: number };
export type StatusBreakdownItem = { status: string; label: string; count: number; color: string };
export type SaudeBreakdownItem = { saude: string; label: string; count: number; color: string };
export type BudgetSummaryItem = { label: string; value: number; color: string };

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
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

// Fundo por trás do plot — mesmo tratamento em todo gráfico (linha,
// coluna, pizza) em toda a plataforma, pra dar mais contraste contra o
// card branco que já envolve o gráfico.
function ChartBackdrop({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-neutral-50 p-2">{children}</div>;
}

// Fatia "estourando" um pouco pra fora quando o mouse passa em cima —
// dá uma resposta visual ao hover que gráfico de pizza estático não tem.
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
    <ChartBackdrop>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.045)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
            labelStyle={{ fontWeight: 600, color: "#292524" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="total"
            name="Total de demandas"
            fill="rgb(var(--brand-500))"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            animationDuration={500}
          />
          <Line
            type="monotone"
            dataKey="concluidas"
            name="Concluídas"
            stroke="#4ade80"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#4ade80" }}
            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
            animationDuration={600}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartBackdrop>
  );
}

export function StatusPieChart({ data }: { data: StatusBreakdownItem[] }) {
  if (data.length === 0) return <EmptyChart label="Sem demandas pra mostrar." />;

  return (
    <div>
      <ChartBackdrop>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              activeShape={ActiveSlice}
              animationDuration={500}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={d.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBackdrop>
      <PieLegend items={data} />
    </div>
  );
}

export function SaudePieChart({ data }: { data: SaudeBreakdownItem[] }) {
  if (data.length === 0) return <EmptyChart label="Sem campanhas ativas pra mostrar." />;

  return (
    <div>
      <ChartBackdrop>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              activeShape={ActiveSlice}
              animationDuration={500}
            >
              {data.map((d) => (
                <Cell key={d.saude} fill={d.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBackdrop>
      <PieLegend items={data} />
    </div>
  );
}

// Barras comparando planejado x aprovado x investido em cima de todas
// as campanhas do ministério — no lugar do gráfico de "campanhas por
// saúde" (categórico, pouco acionável sozinho). Dado real: vem de
// getBudgetSummary() em cima das campanhas já buscadas.
export function CampaignBudgetChart({ data }: { data: BudgetSummaryItem[] }) {
  const hasValue = data.some((d) => d.value > 0);
  if (!hasValue) return <EmptyChart label="Nenhum orçamento cadastrado nas campanhas ainda." />;

  const formatMoney = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <ChartBackdrop>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.045)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }}
            formatter={(value) => formatMoney(Number(value))}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={70} animationDuration={500}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartBackdrop>
  );
}

// Círculo de conclusão: concluídas x restantes, em um gráfico de pizza
// (não em número de porcentagem) — pensado como o elemento mais
// "chamativo" da tela. Dado real (não é decorativo): total e concluídas
// já vêm calculados em summarizeDemands().
export function ConclusionGauge({ total, concluidas }: { total: number; concluidas: number }) {
  const restantes = Math.max(total - concluidas, 0);
  const data =
    total > 0
      ? [
          { name: "Concluídas", value: concluidas, color: "rgb(var(--brand-500))" },
          { name: "Em andamento", value: restantes, color: "#e7e5e4" },
        ]
      : [{ name: "Sem demandas", value: 1, color: "#e7e5e4" }];

  return (
    <div>
      <ChartBackdrop>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              activeShape={ActiveSlice}
              animationDuration={500}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartBackdrop>
      {total > 0 && (
        <PieLegend
          items={[
            { label: "Concluídas", count: concluidas, color: "rgb(var(--brand-500))" },
            { label: "Em andamento", count: restantes, color: "#e7e5e4" },
          ]}
        />
      )}
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
