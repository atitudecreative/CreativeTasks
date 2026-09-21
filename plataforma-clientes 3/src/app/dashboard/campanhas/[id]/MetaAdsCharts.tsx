"use client";

import {
  ResponsiveContainer, BarChart, Bar, ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Cell,
} from "recharts";
import { Icon, BarRow, EmptyState, cn } from "@/components/ui";
import {
  ACCENT, AXIS, AXIS_TICK, GRID, MUTED, seriesColor,
  ChartTooltip, ChartEmpty, ChartLegend, ChartDataTable,
} from "@/components/charts/primitives";
import { formatMoney, formatCompact } from "@/lib/metricLanguage";
import type { MetaWeeklyStat, MetaDemographicItem, MetaAd } from "@/lib/data/metaAds";

/* =========================================================================
   GRÁFICOS DE MÍDIA PAGA
   -------------------------------------------------------------------------
   Reescritos em cima do sistema de gráfico do produto (mesmo eixo, mesma
   grade, mesmo tooltip, mesma paleta validada), e com três mudanças de
   forma:

   1. GÊNERO deixa de ser pizza. Duas ou três fatias numa rosca é a forma
      mais fraca possível pra esse dado; virou barra empilhada com rótulo
      direto, que compara melhor e cabe em qualquer largura.
   2. IDADE deixa de ter uma lista-resumo DUPLICANDO o gráfico logo acima.
      Ficou só o ranking de barras, que já traz o valor no rótulo.
   3. Criativos usam barra proporcional simples (não gráfico), porque o
      que importa ali é ordem e proporção, com o nome do criativo legível
      por extenso.
   ========================================================================= */

const GENDER_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  unknown: "Não informado",
};

// Slots da paleta validada, na ordem fixa. O terceiro vai pro cinza de
// contexto porque "não informado" é ausência de dado, não uma categoria.
const GENDER_COLOR: Record<string, string> = {
  female: seriesColor(0),
  male: seriesColor(1),
  unknown: MUTED,
};

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

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

/* -------------------------------------------------------------------------
   PÚBLICO POR GÊNERO — barra empilhada com rótulo direto.
   ------------------------------------------------------------------------- */
export function MetaGenderChart({ data }: { data: MetaDemographicItem[] }) {
  if (data.length === 0) return <ChartEmpty label="Sem dados demográficos sincronizados." height="h-32" />;

  const total = data.reduce((sum, d) => sum + d.investimento, 0);
  if (total === 0) return <ChartEmpty label="Sem investimento distribuído por gênero." height="h-32" />;

  const ordered = [...data].sort((a, b) => b.investimento - a.investimento);

  return (
    <div>
      <div className="flex h-8 w-full gap-0.5 overflow-hidden" role="img" aria-label={
        "Investimento por gênero: " +
        ordered.map((d) => `${GENDER_LABEL[d.chave] ?? d.chave} ${((d.investimento / total) * 100).toFixed(0)}%`).join(", ")
      }>
        {ordered.map((d, i) => {
          const pct = (d.investimento / total) * 100;
          return (
            <span
              key={d.chave}
              style={{ width: `${pct}%`, backgroundColor: GENDER_COLOR[d.chave] ?? seriesColor(i) }}
              className={cn(
                "flex items-center justify-center overflow-hidden",
                i === 0 && "rounded-l-[6px]",
                i === ordered.length - 1 && "rounded-r-[6px]"
              )}
            >
              {pct >= 14 && (
                <span className="text-[0.6875rem] font-semibold tabular-nums text-white drop-shadow-sm">
                  {pct.toFixed(0)}%
                </span>
              )}
            </span>
          );
        })}
      </div>

      <ChartLegend
        className="mt-3"
        items={ordered.map((d, i) => ({
          label: GENDER_LABEL[d.chave] ?? d.chave,
          color: GENDER_COLOR[d.chave] ?? seriesColor(i),
          value: formatMoney(d.investimento, true),
        }))}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   PÚBLICO POR IDADE — barras horizontais na ordem etária (não por
   tamanho): faixa de idade tem ordem natural, e embaralhar por volume
   destrói a leitura de "onde está concentrado".
   ------------------------------------------------------------------------- */
export function MetaAgeChart({ data }: { data: MetaDemographicItem[] }) {
  if (data.length === 0) return <ChartEmpty label="Sem dados por faixa etária." height="h-32" />;

  // Ordem etária natural primeiro; qualquer faixa desconhecida vinda do
  // Meta vai pro fim, em vez de ser descartada.
  const known = AGE_ORDER.filter((k) => data.some((d) => d.chave === k)).map(
    (k) => data.find((d) => d.chave === k)!
  );
  const unknown = data.filter((d) => !AGE_ORDER.includes(d.chave));
  const sorted = [...known, ...unknown];

  const max = Math.max(...sorted.map((d) => d.investimento), 1);
  const total = sorted.reduce((s, d) => s + d.investimento, 0);
  const topIndex = sorted.reduce((best, d, i, arr) => (d.investimento > arr[best].investimento ? i : best), 0);

  return (
    <div>
      <div className="divide-y divide-line">
        {sorted.map((d, i) => (
          <BarRow
            key={d.chave}
            label={`${d.chave} anos`}
            value={d.investimento}
            max={max}
            formatted={formatMoney(d.investimento, true)}
            meta={total > 0 ? `${((d.investimento / total) * 100).toFixed(0)}%` : undefined}
            // Ênfase na faixa que mais recebeu investimento; o resto recua.
            colorVar={i === topIndex ? "--chart-accent" : "--line-strong"}
          />
        ))}
      </div>
      <ChartDataTable
        caption="Investimento por faixa etária"
        columns={["Faixa", "Investido", "Participação"]}
        rows={sorted.map((d) => [
          `${d.chave} anos`,
          formatMoney(d.investimento),
          total > 0 ? `${((d.investimento / total) * 100).toFixed(1)}%` : "—",
        ])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   RANKING DE CRIATIVOS — o que consumiu verba e o que entregou.
   ------------------------------------------------------------------------- */
export function MetaAdsRanking({ ads, limit = 8 }: { ads: MetaAd[]; limit?: number }) {
  if (ads.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon.Image className="h-4 w-4" />}
        title="Sem criativos sincronizados"
        description="Os anúncios aparecem aqui depois da próxima sincronização com o Meta Ads."
      />
    );
  }

  const ordered = [...ads].sort((a, b) => (b.investimento ?? 0) - (a.investimento ?? 0));
  const shown = ordered.slice(0, limit);
  const max = Math.max(...shown.map((a) => a.investimento ?? 0), 1);

  return (
    <div>
      <div className="divide-y divide-line">
        {shown.map((ad, i) => (
          <BarRow
            key={ad.id}
            label={ad.nome}
            value={ad.investimento ?? 0}
            max={max}
            formatted={formatMoney(ad.investimento, true)}
            meta={ad.ctr != null ? `CTR ${ad.ctr.toFixed(2)}%` : undefined}
            colorVar={i === 0 ? "--chart-accent" : "--line-strong"}
          />
        ))}
      </div>
      {ordered.length > limit && (
        <p className="mt-2 text-caption text-ink-3">
          Mostrando os {limit} de maior investimento, de {ordered.length} criativos. A tabela completa está abaixo.
        </p>
      )}
    </div>
  );
}
