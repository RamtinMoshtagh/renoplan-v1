import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingProjectOverview() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="auto-grid" style={{ ['--min-card' as any]: '300px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-44 mt-2" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
