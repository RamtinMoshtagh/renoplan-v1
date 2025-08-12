import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingRooms() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-lg border p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-full mt-3" />
      </div>

      <div className="auto-grid mt-2" style={{ ['--min-card' as any]: '280px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24 mt-2" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
