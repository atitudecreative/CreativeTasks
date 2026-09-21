import { Skeleton, SkeletonTable } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-report">
      <div className="mb-6">
        <Skeleton className="mb-2 h-2.5 w-16" />
        <Skeleton className="mb-2 h-8 w-44" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface p-5 shadow-xs">
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <SkeletonTable rows={4} cols={3} />
        </div>
      </div>
    </div>
  );
}
