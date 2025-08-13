// src/app/auth/signout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServer({ allowCookieWrite: true });
  await supabase.auth.signOut(); // clears httpOnly cookies
  return NextResponse.json({ ok: true });
}
