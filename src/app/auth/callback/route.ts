import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(`${origin}/auth/login`)

  const supabase = createSupabaseServer({ allowCookieWrite: true })
  await (await supabase).auth.exchangeCodeForSession(code)

  const { data: { user } } = await (await supabase).auth.getUser()
  if (user) {
    const { data: projects } = await (await supabase)
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (projects?.length) return NextResponse.redirect(`${origin}/projects/${projects[0].id}`)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
