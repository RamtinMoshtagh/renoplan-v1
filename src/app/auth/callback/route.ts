/* // src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/dashboard'

  // IMPORTANT: allow cookie write here (route handler context)
  const supabase = await createSupabaseServer({ allowCookieWrite: true })

  try {
    // Prefer PKCE code if present
    const code = url.searchParams.get('code')
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    } else {
      // Fallback: if Supabase redirected with tokens instead of code
      const access_token = url.searchParams.get('access_token')
      const refresh_token = url.searchParams.get('refresh_token')
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
      }
    }
  } catch {
    // ignore – middleware or page guards will handle unauthenticated state
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
 */