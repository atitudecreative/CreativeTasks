import { Skeleton, SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="mb-2 h-2.5 w-28" />
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <Skeleton className="mb-5 h-24 w-full rounded-card" />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
