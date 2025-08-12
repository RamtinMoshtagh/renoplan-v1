export function ProjectProgress({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="w-full">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1 text-xs opacity-70">{value}%</div>
    </div>
  )
}
