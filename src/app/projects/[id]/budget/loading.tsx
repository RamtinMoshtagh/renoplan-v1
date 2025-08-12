import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingBudget() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="p-3 border-b bg-background sticky top-0 z-10">
          <Skeleton className="h-5 w-48" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 px-4 py-3 border-b">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
