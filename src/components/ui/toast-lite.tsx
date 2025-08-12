'use client';

import * as React from 'react';
// If you already use lucide-react, uncomment the next line and the icon below.
// import { Check } from 'lucide-react';

export function ToastLite({ message, timeout = 2200 }: { message?: string; timeout?: number }) {
  const [open, setOpen] = React.useState(Boolean(message));

  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      setOpen(false);
      // Remove ?toast=... so it won't re-trigger on back/refresh
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }, timeout);
    return () => clearTimeout(t);
  }, [message, timeout]);

  if (!open || !message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <div className="rounded-md border bg-card text-card-foreground shadow-soft px-3 py-2 text-sm flex items-center gap-2">
        {/* <Check className="h-4 w-4" /> */}
        <span>{message}</span>
      </div>
    </div>
  );
}
