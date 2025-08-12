// src/app/login/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (projects && projects.length > 0) redirect(`/projects/${projects[0].id}`)
    redirect('/dashboard')
  }

  const params = await searchParams
  const nextRaw = Array.isArray(params?.next) ? params.next[0] : params?.next
  const nextPath = nextRaw && nextRaw.startsWith('/') ? nextRaw : '/dashboard'

  return <LoginForm title="Sign in to RenoPlan" cta="Send magic link" nextPath={nextPath} />
}
