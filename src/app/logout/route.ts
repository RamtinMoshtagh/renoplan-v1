// src/app/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next')
  const dest = next && next.startsWith('/') ? next : '/marketing'

  // Pass a function that returns a Promise<ReadonlyRequestCookies>
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })

  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(dest, url.origin))
}

// Optional POST support
export const POST = GET
