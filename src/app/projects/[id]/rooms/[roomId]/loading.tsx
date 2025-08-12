import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingRoomDetail() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="auto-grid" style={{ ['--min-card' as any]: '320px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
            <Skeleton className="h-9 w-64 mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
