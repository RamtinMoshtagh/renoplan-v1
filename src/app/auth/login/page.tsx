'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = supabaseBrowser()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
      toast.success('Magic link sent! Check your inbox.')
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to RenoPlan</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm opacity-80">
              We’ve sent a sign-in link to <strong>{email}</strong>. Open it to continue.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send magic link'}
              </Button>
              <p className="text-xs opacity-70">
                By continuing you agree to our{' '}
                <Link className="underline" href="#">Terms</Link>.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
