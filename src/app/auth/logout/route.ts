import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function cookieSecurity() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  try {
    const u = new URL(site);
    const isHttps = u.protocol === 'https:';
    const host = u.hostname;
    const isLan =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local');
    return { secure: isHttps && !isLan, sameSite: 'lax' as const };
  } catch {
    return { secure: false, sameSite: 'lax' as const };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const next = url.searchParams.get('next') || '/login';

  const store = await cookies();
  const res = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/login'}`);

  const { secure, sameSite } = cookieSecurity();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set({ name, value, path: '/', ...options, secure, sameSite });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set({ name, value: '', path: '/', ...options, maxAge: 0, secure, sameSite });
        },
      },
    }
  );

  await supabase.auth.signOut(); // clears session cookies on `res`
  return res;
}
