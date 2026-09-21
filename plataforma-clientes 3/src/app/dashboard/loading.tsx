import { Skeleton, SkeletonMetricRow, SkeletonPanel } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div className="space-y-section">
      <div>
        <Skeleton className="mb-2 h-2.5 w-36" />
        <Skeleton className="mb-2 h-8 w-80 max-w-full" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-panel border border-line bg-surface p-5 shadow-xs lg:col-span-3">
          <Skeleton className="mb-4 h-3.5 w-40" />
          <Skeleton className="h-9 w-full rounded-[6px]" />
          <div className="mt-5 grid grid-cols-4 gap-4 border-t border-line pt-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-2.5 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-panel border border-line bg-surface p-5 shadow-xs lg:col-span-2">
          <Skeleton className="mb-4 h-3.5 w-32" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-1.5 h-3 w-full" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SkeletonMetricRow count={4} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonPanel />
        </div>
        <SkeletonPanel />
      </div>
    </div>
  );
}
