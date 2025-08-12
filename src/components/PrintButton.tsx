'use client';
import { Button } from '@/components/ui/button';

export function PrintButton({ children = 'Print' }: { children?: React.ReactNode }) {
  return (
    <Button onClick={() => window.print()} className="no-print">
      {children}
    </Button>
  );
}
