import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * In Server Components, use default (read-only cookies).
 * In Server Actions / Route Handlers, call with { allowCookieWrite: true }.
 */
export async function createSupabaseServer(opts: { allowCookieWrite?: boolean } = {}) {
  const { allowCookieWrite = false } = opts
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          if (!allowCookieWrite) return
          try { cookieStore.set({ name, value, ...options }) } catch { /* ignore in RSC */ }
        },
        remove(name: string, options: CookieOptions) {
          if (!allowCookieWrite) return
          try { cookieStore.set({ name, value: '', ...options }) } catch { /* ignore in RSC */ }
        },
      },
    }
  )
}
