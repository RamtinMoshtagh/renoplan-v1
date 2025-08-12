// src/lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

type Opts = { allowCookieWrite?: boolean }

export async function createSupabaseServer(opts: Opts = {}) {
  const cookieStore = await cookies()
  const write = opts.allowCookieWrite !== false // default true

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => cookieStore.get(name)?.value,
        set: async (name: string, value: string, options?: any) => {
          if (!write) return
          cookieStore.set({ name, value, ...options })
        },
        remove: async (name: string, options?: any) => {
          if (!write) return
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}
