import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingReport() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="auto-grid" style={{ ['--min-card' as any]: '320px' }}>
        {[0,1].map(i => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 border-b last:border-0 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
