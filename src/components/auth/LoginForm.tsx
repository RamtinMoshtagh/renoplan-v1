'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase/browser';
import { syncServerSession } from '@/lib/auth/sync';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function sanitizeNext(n?: string | null) {
  return n && n.startsWith('/') ? n : '/dashboard';
}

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = sanitizeNext(nextPath);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!isValidEmail(email)) return setError('Please enter a valid email.');
    if (!password) return setError('Please enter your password.');

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setSubmitting(false);
      return setError(error.message);
    }

    // Sync client session -> server httpOnly cookies so SSR sees you
    await syncServerSession();

    setSubmitting(false);
    router.replace(next);
  }

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Sign in to RenoPlan</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={email.length > 0 && !isValidEmail(email)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
              />
            </div>

            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password || !isValidEmail(email)}
              aria-busy={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="flex items-center justify-between text-xs opacity-80">
              <Link href="/reset-password" className="underline underline-offset-2" prefetch={false}>
                Forgot password?
              </Link>
              <Link href="/signup" className="underline underline-offset-2" prefetch={false}>
                Create account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
