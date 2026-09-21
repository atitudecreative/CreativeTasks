import { Skeleton, SkeletonText } from "@/components/ui";

/* Skeleton que imita o layout REAL desta tela. Um esqueleto genérico
   mostra uma forma e entrega outra — a página "pula" na troca e o ganho
   de tempo percebido se perde em confiança. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-report space-y-5">
      <Skeleton className="h-3 w-52" />
      <div>
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="mb-2 h-8 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface shadow-xs lg:col-span-2">
          <div className="border-b border-line px-5 py-3">
            <Skeleton className="h-3.5 w-40" />
          </div>
          <div className="p-5">
            <SkeletonText lines={5} />
          </div>
        </div>
        <div className="rounded-panel border border-line bg-surface shadow-xs">
          <div className="border-b border-line px-5 py-3">
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="space-y-4 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="mb-1.5 h-2.5 w-20" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
