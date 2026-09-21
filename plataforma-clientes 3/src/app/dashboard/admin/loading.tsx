import { Skeleton, SkeletonMetricRow, SkeletonTable } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="mb-2 h-2.5 w-28" />
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <SkeletonMetricRow count={4} />
      <div className="mt-6">
        <SkeletonTable rows={6} cols={5} />
      </div>
    </div>
  );
}
