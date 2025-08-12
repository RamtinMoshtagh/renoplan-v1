'use client'

import { useState, FormEvent, useMemo } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function LoginForm({
  title = 'Welcome to RenoPlan',
  cta = 'Send magic link',
  nextPath, // optional: where to go after login
}: { title?: string; cta?: string; nextPath?: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Safe site URL for prod/dev
  const siteUrl = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email.')
      return
    }
    setLoading(true)
    try {
      const supabase = supabaseBrowser()
      // carry next param through the callback (optional)
      const redirect = new URL('/auth/callback', siteUrl)
      if (nextPath && nextPath.startsWith('/')) redirect.searchParams.set('next', nextPath)

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect.toString() },
      })

      if (error) throw error
      setSent(true)
      toast.success('Magic link sent! Check your inbox.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong sending your link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm opacity-80">
              We’ve sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
              <br />Check spam if you don’t see it within a minute.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-invalid={email.length > 0 && !isValidEmail(email)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : cta}
              </Button>
              <p className="text-xs opacity-70">
                By continuing you agree to our{' '}
                <Link className="underline" href="/legal/terms">Terms</Link>{' '}and{' '}
                <Link className="underline" href="/legal/privacy">Privacy</Link>.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
