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

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export default function SignupForm() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null); setMessage(null);
    if (!isValidEmail(email)) return setError('Please enter a valid email.');
    if (!password) return setError('Please choose a password.');

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setSubmitting(false); return setError(error.message); }

    // If confirmations ON -> no session yet. Tell user to confirm and stop here.
    if (!data.session) {
      setSubmitting(false);
      setMessage('Check your inbox to confirm your email, then sign in.');
      return;
    }

    // Confirmations OFF -> we have a session; sync it to server cookies
    await syncServerSession();

    setSubmitting(false);
    router.replace('/dashboard');
  }

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Create your RenoPlan account</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email"
                     value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password"
                     value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a strong password" />
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            {message ? <p className="text-sm text-green-600 dark:text-green-400">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting || !email || !password} aria-busy={submitting}>
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
            <p className="text-xs opacity-80">
              Already have an account? <Link href="/login" className="underline underline-offset-2" prefetch={false}>Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
