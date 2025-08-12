// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => cookieStore.get(name)?.value,
        set: async (name: string, value: string, options?: any) => {
          cookieStore.set({ name, value, ...options })
        },
        remove: async (name: string, options?: any) => {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    )
  }

  if (next && next.startsWith('/')) {
    return NextResponse.redirect(new URL(next, url.origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (projects && projects.length > 0) {
      return NextResponse.redirect(new URL(`/projects/${projects[0].id}`, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
