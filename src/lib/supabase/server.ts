import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type Options = { allowCookieWrite?: boolean };

function computeCookieSecurity() {
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

export async function createSupabaseServer(opts: Options = {}) {
  const cookieStore = await cookies();
  const canWrite = opts.allowCookieWrite ?? true;
  const { secure, sameSite } = computeCookieSecurity();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          if (!canWrite) return;
          try {
            (cookieStore as any).set({ name, value, ...options, secure, sameSite });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          if (!canWrite) return;
          try {
            (cookieStore as any).set({ name, value: '', maxAge: 0, ...options, secure, sameSite });
          } catch {}
        },
      },
    }
  );
}
