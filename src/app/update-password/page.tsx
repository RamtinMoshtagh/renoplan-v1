'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import { syncServerSession } from '@/lib/auth/sync';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UpdatePasswordPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null); setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setSubmitting(false); return setError(error.message); }

    // Make sure SSR sees the new session
    await syncServerSession();

    setSubmitting(false);
    setMessage('Password updated. Redirecting…');
    setTimeout(() => router.replace('/dashboard'), 700);
  }

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Set a new password</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password"
                     value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            {message ? <p className="text-sm text-green-600 dark:text-green-400">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting || !password} aria-busy={submitting}>
              {submitting ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
