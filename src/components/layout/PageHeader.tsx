'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 md:mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
      <div>
        <h1 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground max-w-prose">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
