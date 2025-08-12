import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createSupabaseServer()
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

  // Not signed in → send to marketing landing
  redirect('/marketing')
}
