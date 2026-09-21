import { Skeleton, SkeletonMetricRow, SkeletonPanel } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-3 h-3 w-64" />
      <div className="mb-5 overflow-hidden rounded-panel border border-line bg-surface shadow-xs">
        <Skeleton className="h-36 w-full rounded-none sm:h-48" />
        <div className="p-5">
          <Skeleton className="mb-2.5 h-5 w-40 rounded-full" />
          <Skeleton className="mb-2 h-8 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="mb-5 h-10 w-full" />
      <div className="space-y-section">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-panel border border-line bg-surface p-5 shadow-xs lg:col-span-2">
            <Skeleton className="mb-3 h-2.5 w-20" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="rounded-panel border border-line bg-surface p-5 shadow-xs">
            <Skeleton className="mb-4 h-3.5 w-32" />
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-1.5 h-2.5 w-20" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <SkeletonMetricRow count={4} />
        <SkeletonPanel />
      </div>
    </div>
  );
}
