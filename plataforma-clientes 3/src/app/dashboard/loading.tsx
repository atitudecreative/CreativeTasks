import { Skeleton, SkeletonMetricRow, SkeletonPanel } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela: cabeçalho, bloco de
   resultado (título, filtro de período, quatro indicadores, lista de
   campanhas) e o trilho de atenção. Um esqueleto genérico mostra uma forma
   e entrega outra — a página "pula" na troca e o ganho de tempo percebido
   se perde em confiança. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="mb-2 h-2.5 w-36" />
        <Skeleton className="h-8 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div>
            <Skeleton className="mb-2 h-2.5 w-40" />
            <Skeleton className="mb-2 h-6 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-72 max-w-full rounded-control" />
          <SkeletonMetricRow count={4} />
          <SkeletonPanel />
        </div>
        <div className="hidden space-y-4 xl:block">
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </div>
    </div>
  );
}
