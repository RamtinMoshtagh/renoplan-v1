import { cn } from '@/lib/utils'
import * as React from 'react'

export default function Empty({
  icon,
  children,
  className,
}: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-md border border-dashed p-8 text-center text-sm opacity-80', className)}>
      {icon && <div className="mb-2 grid place-items-center">{icon}</div>}
      {children}
    </div>
  )
}
