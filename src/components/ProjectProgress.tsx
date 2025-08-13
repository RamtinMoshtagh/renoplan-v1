export function ProjectProgress({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div>
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Project completion"
      >
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1 text-xs opacity-70">{value}%</div>
    </div>
  )
}
