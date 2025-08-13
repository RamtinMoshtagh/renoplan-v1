// src/lib/auth/sync.ts
import { createSupabaseBrowser } from '@/lib/supabase/browser';

export async function syncServerSession() {
  const supabase = createSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  const access_token = session?.access_token;
  const refresh_token = session?.refresh_token;
  if (!access_token || !refresh_token) return false;

  const res = await fetch('/auth/set-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ access_token, refresh_token }),
  });
  return res.ok;
}
