"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

/* O Recharts entra por import dinâmico, como nos outros gráficos do
   produto (components/charts/Charts.tsx): a biblioteca só é baixada quando
   o gráfico monta. O esqueleto tem a altura final do gráfico e dos
   controles, para a página não pular quando ele chegar. */
export const GraficoEvolucao = dynamic(() => import("./GraficoEvolucaoImpl").then((m) => m.GraficoEvolucao), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-72 max-w-full rounded-control" />
      </div>
      <div className="mt-5 flex gap-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="mt-4 h-[240px] w-full rounded-card sm:h-[300px]" />
    </div>
  ),
});
