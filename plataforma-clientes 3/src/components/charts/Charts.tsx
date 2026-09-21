"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

/* =========================================================================
   CARREGAMENTO TARDIO DOS GRÁFICOS
   -------------------------------------------------------------------------
   O Recharts pesa ~90 kB e vinha no bundle inicial de toda tela que
   importasse qualquer gráfico — inclusive telas em que o gráfico está
   bem abaixo da dobra (a seção "Tendência" do Início, a seção "Mídia" do
   relatório de evento).

   Aqui cada gráfico vira um import dinâmico: a biblioteca só é baixada
   quando o componente monta de fato. `ssr: false` porque gráfico não tem
   utilidade nenhuma no HTML do servidor — o Recharts mede o container no
   cliente pra desenhar, então o markup renderizado no servidor seria
   descartado e rehidratado de qualquer jeito.

   O `loading` devolve um esqueleto da ALTURA CERTA de cada gráfico. Isso
   não é enfeite: sem altura reservada a página empurraria o conteúdo
   abaixo quando o gráfico chegasse (layout shift), que é justamente o
   defeito que carregamento tardio costuma introduzir.
   ========================================================================= */

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="flex items-end gap-2" style={{ height }} aria-hidden="true">
      {[58, 82, 44, 96, 70, 88, 52].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export const VolumeChart = dynamic(() => import("./ChartsImpl").then((m) => m.VolumeChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={240} />,
});

export const BudgetChart = dynamic(() => import("./ChartsImpl").then((m) => m.BudgetChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export const TrendArea = dynamic(() => import("./ChartsImpl").then((m) => m.TrendArea), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export const MultiLineChart = dynamic(() => import("./ChartsImpl").then((m) => m.MultiLineChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={240} />,
});

export const RankedBars = dynamic(() => import("./ChartsImpl").then((m) => m.RankedBars), {
  ssr: false,
  loading: () => <ChartSkeleton height={180} />,
});

// Estes três são leves (HTML e CSS puro, sem Recharts) e são usados
// junto de gráfico e fora dele — ficam no bundle normal.
export { ChartEmpty, ChartLegend, ChartDataTable } from "./primitives";
