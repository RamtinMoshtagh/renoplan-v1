// app/api/auth-session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  const reqCookies = await cookies();
  const res = NextResponse.next(); // we'll reuse its Set-Cookie headers

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return reqCookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getSession();

  // return JSON while preserving any Set-Cookie headers created above
  const headers = new Headers(res.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify({ data, error }), { status: 200, headers });
}
