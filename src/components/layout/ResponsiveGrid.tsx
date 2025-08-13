'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function ResponsiveGrid({
  className,
  min = 280,
  gap = '1rem',
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { min?: number; gap?: number | string }) {
  return (
    <div
      className={cn('auto-grid', className)}
      style={{
        '--min-card': `${min}px`,
        '--gap': typeof gap === 'number' ? `${gap}px` : gap,
        ...style,
      } as React.CSSProperties}
      {...props}
    />
  );
}
