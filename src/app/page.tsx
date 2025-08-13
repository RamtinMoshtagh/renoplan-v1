// app/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  // ✅ allow cookie writes so refreshed tokens persist in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true })
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (projects && projects.length > 0) {
      redirect(`/projects/${projects[0].id}`)
    }

    redirect('/dashboard')
  }

  // Not signed in → marketing landing
  redirect('/marketing')
}
