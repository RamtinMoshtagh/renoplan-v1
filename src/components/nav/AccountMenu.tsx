'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createSupabaseBrowser } from '@/lib/supabase/browser'; // keep consistent with the rest

export default function AccountMenu({ email: initialEmail }: { email?: string }) {
  const [email, setEmail] = useState(initialEmail ?? '');

  useEffect(() => {
    if (initialEmail) return;
    let cancelled = false;
    const supa = createSupabaseBrowser();
    supa.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user?.email) setEmail(data.user.email);
    });
    return () => {
      cancelled = true;
    };
  }, [initialEmail]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Account menu">
          {email || 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          {/* If your /logout route ignores ?next=, either change this to "/logout" or update the route to read it */}
          <Link href="/auth/logout?next=/marketing" className="w-full">Sign out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
