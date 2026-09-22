"use client";

import dynamic from "next/dynamic";
import { Icon, BarRow, EmptyState, Skeleton, cn } from "@/components/ui";
import { MUTED, seriesColor, ChartEmpty, ChartLegend, ChartDataTable } from "@/components/charts/primitives";
import { formatMoney, formatPercent } from "@/lib/metricLanguage";
import type { MetaDemographicItem, MetaAd } from "@/lib/data/metaAds";

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

/* -------------------------------------------------------------------------
   EVOLUÇÃO SEMANAL — único gráfico deste arquivo que usa Recharts.
   Por isso ele mora em MetaWeeklyChartImpl e entra por import dinâmico: os
   outros três daqui (gênero, idade, criativos) são HTML e CSS puro, e não
   faz sentido arrastar ~90 kB de biblioteca por causa de um só.
   ------------------------------------------------------------------------- */
export const MetaWeeklyChart = dynamic(
  () => import("./MetaWeeklyChartImpl").then((m) => m.MetaWeeklyChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[230px] items-end gap-2" aria-hidden="true">
        {[58, 82, 44, 96, 70, 88, 52].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
  }
);

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
          total > 0 ? formatPercent((d.investimento / total) * 100, 1) : "—",
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
            meta={ad.ctr != null ? `CTR ${formatPercent(ad.ctr, 2)}` : undefined}
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
