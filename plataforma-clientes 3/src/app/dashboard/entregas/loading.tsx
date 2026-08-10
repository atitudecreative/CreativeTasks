import { Skeleton, SkeletonTable } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-6 h-4 w-72" />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-20" />
      </div>

      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
