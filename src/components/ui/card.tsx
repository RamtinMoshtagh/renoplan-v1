// src/components/ui/card.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'elevated' | 'outline' | 'ghost';
type Density = 'compact' | 'cozy' | 'spacious';

type CardRootProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  density?: Density;
  interactive?: boolean;
};

const paddings: Record<Density, string> = {
  compact: 'p-3 md:p-3.5',
  cozy: 'p-4 md:p-5',
  spacious: 'p-5 md:p-6',
};

export function Card({
  className,
  variant = 'elevated',
  density = 'cozy',
  interactive = false,
  ...props
}: CardRootProps) {
  const base = 'rounded-xl bg-card text-card-foreground animate-card-pop';
  const byVariant =
    variant === 'outline'
      ? 'border border-border'
      : variant === 'ghost'
      ? 'bg-transparent shadow-none'
      : 'border border-border card-elevated';
  const byInteractive = interactive
    ? 'transition hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring cursor-pointer'
    : '';

  return (
    <div
      className={cn(base, byVariant, paddings[density], byInteractive, className)}
      {...(interactive ? { tabIndex: 0, role: 'button' } : {})}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pb-3 md:pb-4 mb-2 border-b border-border', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pt-2', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-3 pt-3 border-t border-border', className)} {...props} />;
}
