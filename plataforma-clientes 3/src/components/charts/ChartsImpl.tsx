"use client";

import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell, AreaChart,
} from "recharts";
import { ACCENT, AXIS, AXIS_TICK, GRID, MUTED, seriesColor, ChartTooltip, ChartEmpty, ChartLegend, ChartDataTable } from "./primitives";

/* =========================================================================
   GRÁFICOS (implementação)
   -------------------------------------------------------------------------
   Este módulo carrega o Recharts. Nada deve importá-lo direto: a porta de
   entrada é ./Charts, que faz o import dinâmico e mantém a biblioteca
   fora do bundle inicial.
   -------------------------------------------------------------------------
   Um arquivo, um vocabulário. Cada gráfico aqui existe porque responde a
   uma pergunta que número sozinho não responde — nenhum é decoração.

   Padrões aplicados em todos:
   - Grade só horizontal e recuada; eixo sem linha; marcas finas.
   - Topo de barra arredondado em 4px, ancorado na base.
   - Tooltip próprio (herda o tema) em vez do branco fixo do Recharts.
   - Nenhum gráfico de dois eixos Y. Medidas de escala diferente viram
     dois gráficos ou são indexadas — eixo duplo é o erro clássico de
     leitura, e a versão anterior do dashboard tinha um (barra de total +
     linha de concluídas no mesmo eixo passava por pouco; aqui as duas
     séries são contagens comparáveis, então dividem o eixo legitimamente).
   - <details> com o mesmo dado em tabela, pra leitor de tela e pros casos
     em que a cor não alcança 3:1 de contraste.
   ========================================================================= */

const MARGIN = { top: 8, right: 8, left: -18, bottom: 0 };

function num(v: number) {
  return v.toLocaleString("pt-BR");
}
function money(v: number, compact = false) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(v) >= 10000 ? "compact" : "standard",
  });
}

/* -------------------------------------------------------------------------
   VOLUME POR MÊS — total x concluídas.
   Forma: colunas (total) + linha (concluídas) no MESMO eixo, porque as
   duas são contagem de demanda e concluídas é subconjunto do total. É
   isso que deixa ler "quanto entrou" e "quanto fechou" de uma vez.

   A série é de PRAZO, então os últimos meses são compromisso combinado e
   não trabalho realizado. Mês em curso e mês futuro vêm com a barra vazada
   (contorno, sem preenchimento) — a diferença que separa "já aconteceu" de
   "ainda vai acontecer" não pode depender de o leitor saber que dia é hoje.
   ------------------------------------------------------------------------- */
export function VolumeChart({
  data,
  height = 240,
}: {
  data: { label: string; total: number; concluidas: number; emCurso?: boolean; futuro?: boolean }[];
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty label="Sem demandas com prazo definido para montar a série." />;

  const temProjecao = data.some((d) => d.emCurso || d.futuro);
  const rotuloDoMes = (d: (typeof data)[number]) =>
    d.futuro ? `${d.label} · prazo futuro` : d.emCurso ? `${d.label} · mês em curso` : d.label;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={MARGIN}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis allowDecimals={false} width={44} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <RTooltip
            cursor={{ fill: "rgb(var(--ink) / 0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as (typeof data)[number] | undefined;
              if (!d) return null;
              return (
                <ChartTooltip
                  title={rotuloDoMes(d)}
                  rows={[
                    { label: "Com prazo no mês", value: num(d.total), color: ACCENT },
                    { label: "Já concluídas", value: num(d.concluidas), color: seriesColor(2) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={480}>
            {data.map((d, i) => (
              <Cell
                key={`${d.label}-${i}`}
                fill={d.emCurso || d.futuro ? "transparent" : ACCENT}
                stroke={d.emCurso || d.futuro ? ACCENT : undefined}
                strokeWidth={d.emCurso || d.futuro ? 1.5 : 0}
                strokeDasharray={d.futuro ? "3 2" : undefined}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="concluidas"
            stroke={seriesColor(2)}
            strokeWidth={2}
            dot={{ r: 3, fill: seriesColor(2), strokeWidth: 0 }}
            // Anel de 2px na cor da superfície: separa o ponto da barra
            // quando os dois se sobrepõem.
            activeDot={{ r: 5, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
            animationDuration={560}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Duas séries no gráfico => legenda sempre presente: a identidade
          de cada série nunca pode depender só da cor. */}
      <ChartLegend
        className="mt-2"
        items={[
          { label: "Com prazo no mês", color: ACCENT },
          { label: "Já concluídas", color: seriesColor(2) },
        ]}
      />
      {temProjecao && (
        <p className="mt-1.5 text-caption text-ink-3">
          Barra vazada: mês em curso ou prazo ainda no futuro — o número ainda pode mudar.
        </p>
      )}
      <ChartDataTable
        caption="Demandas por mês de prazo"
        columns={["Mês", "Com prazo no mês", "Já concluídas"]}
        rows={data.map((d) => [rotuloDoMes(d), d.total, d.concluidas])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   ORÇAMENTO — planejado x aprovado x investido.
   Forma de ÊNFASE, não categórica: as três barras são o mesmo conceito em
   três momentos, então a que importa (investido, o número real) fica na
   cor de marca e as outras recuam pro cinza. Três cores fortes aqui
   sugeririam que são coisas diferentes.
   ------------------------------------------------------------------------- */
export function BudgetChart({
  data,
  height = 220,
}: {
  data: { label: string; value: number; emphasis?: boolean }[];
  height?: number;
}) {
  if (!data.some((d) => d.value > 0)) {
    return <ChartEmpty label="Nenhum orçamento cadastrado nas campanhas ainda." />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ ...MARGIN, left: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis
            width={56}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--ink) / 0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltip
                  rows={[{ label: String(payload[0]?.payload?.label ?? ""), value: money(Number(payload[0]?.value ?? 0)) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64} animationDuration={480}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.emphasis ? ACCENT : MUTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartDataTable
        caption="Orçamento das campanhas"
        columns={["Etapa", "Valor"]}
        rows={data.map((d) => [d.label, money(d.value)])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   EVOLUÇÃO SEMANAL DE MÍDIA — investimento ao longo das semanas.
   Área de série única na cor de marca: o que interessa é o formato da
   curva (quando o dinheiro entrou), não comparar categorias.
   ------------------------------------------------------------------------- */
export function TrendArea({
  data,
  valueKey = "value",
  labelKey = "label",
  formatter = money,
  seriesName,
  height = 220,
}: {
  data: Record<string, string | number>[];
  valueKey?: string;
  labelKey?: string;
  formatter?: (v: number) => string;
  seriesName: string;
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty label="Sem histórico semanal registrado." />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ ...MARGIN, left: 4 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={labelKey} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis
            width={56}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
          />
          <RTooltip
            cursor={{ stroke: AXIS, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  title={String(label)}
                  rows={[{ label: seriesName, value: formatter(Number(payload[0]?.value ?? 0)), color: ACCENT }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#trend-fill)"
            dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
            animationDuration={520}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ChartDataTable
        caption={seriesName}
        columns={["Período", seriesName]}
        rows={data.map((d) => [String(d[labelKey]), formatter(Number(d[valueKey]))])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   MULTI-SÉRIE — linhas comparando medidas de MESMA unidade.
   Recusa mais de 8 séries de propósito: a partir daí quem chama tem que
   agrupar o excedente, e não ganhar mais um matiz gerado.
   ------------------------------------------------------------------------- */
export function MultiLineChart({
  data,
  series,
  labelKey = "label",
  formatter = num,
  height = 240,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string }[];
  labelKey?: string;
  formatter?: (v: number) => string;
  height?: number;
}) {
  if (data.length === 0 || series.length === 0) return <ChartEmpty label="Sem dados para comparar." />;
  const shown = series.slice(0, 8);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ ...MARGIN, left: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={labelKey} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} dy={4} />
          <YAxis width={48} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <RTooltip
            cursor={{ stroke: AXIS, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  title={String(label)}
                  rows={payload.map((p, i) => ({
                    label: shown[i]?.name ?? String(p.dataKey),
                    value: formatter(Number(p.value ?? 0)),
                    color: seriesColor(i),
                  }))}
                />
              ) : null
            }
          />
          {shown.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={seriesColor(i)}
              strokeWidth={2}
              dot={{ r: 3, fill: seriesColor(i), strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "rgb(var(--surface))", strokeWidth: 2 }}
              animationDuration={480}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------
   DISTRIBUIÇÃO CATEGÓRICA — barras horizontais ordenadas.
   Substitui a pizza em tudo que não é parte-de-todo com poucas fatias:
   nome longo cabe, a ordem fica explícita e a comparação de comprimento é
   mais precisa que a de ângulo.
   ------------------------------------------------------------------------- */
export function RankedBars({
  data,
  formatter = num,
  emphasisIndex,
  height,
}: {
  data: { label: string; value: number }[];
  formatter?: (v: number) => string;
  /** Destaca UMA barra e recua as outras (forma de ênfase). */
  emphasisIndex?: number;
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty label="Sem dados para exibir." height="h-40" />;
  const h = height ?? Math.max(140, data.length * 34 + 16);

  return (
    <div>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ ...AXIS_TICK, fontFamily: "var(--font-inter)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <RTooltip
            cursor={{ fill: "rgb(var(--ink) / 0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltip
                  rows={[{ label: String(payload[0]?.payload?.label ?? ""), value: formatter(Number(payload[0]?.value ?? 0)) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} animationDuration={480}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={emphasisIndex == null ? seriesColor(i) : i === emphasisIndex ? ACCENT : MUTED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartDataTable caption="Distribuição" columns={["Item", "Valor"]} rows={data.map((d) => [d.label, formatter(d.value)])} />
    </div>
  );
}

