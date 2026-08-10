import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-2 h-6 w-52" />
      <Skeleton className="mb-6 h-4 w-96" />
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}
