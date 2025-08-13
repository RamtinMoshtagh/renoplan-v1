// src/app/auth/send-otp/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { email, next } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // allow cookie writes in a route handler context
  const supabase = await createSupabaseServer({ allowCookieWrite: true });

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const { error } = await supabase.auth.signInWithOtp({
    email: String(email).trim(),
    options: {
      // Supabase verifies on its domain, then redirects here (with code/tokens)
      // in send-otp route
emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next || '/dashboard')}`

    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
