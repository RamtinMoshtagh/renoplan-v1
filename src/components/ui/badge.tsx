import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-black text-white dark:bg-white dark:text-black',
    secondary: 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
    outline: 'border border-neutral-300 dark:border-neutral-700',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-black',
    destructive: 'bg-red-600 text-white',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
      {...props}
    />
  )
}
