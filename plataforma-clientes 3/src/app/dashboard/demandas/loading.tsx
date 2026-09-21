import { Skeleton, SkeletonTable } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="mb-2 h-2.5 w-20" />
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[64, 84, 96, 112, 88].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>

      <SkeletonTable rows={7} cols={5} />
    </div>
  );
}
