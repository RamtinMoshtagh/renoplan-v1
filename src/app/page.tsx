import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

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

  // Public landing (not signed in)
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-3xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold">RenoPlan</h1>
        <p className="opacity-80 text-balance">
          Plan rom, oppgaver og budsjett. Last opp kvitteringer. Eksporter rapporter.
          Én enkel webapp for hele oppussingen.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Sign in to get started</Link>
          </Button>
        </div>

        <ul className="grid sm:grid-cols-3 gap-3 text-left text-sm mt-6">
          <li className="border rounded-xl p-4 bg-card border-border">
            <div className="font-medium">Rom & Oppgaver</div>
            <div className="opacity-70 mt-1">Organiser alt per rom, sett status og kostnader.</div>
          </li>
          <li className="border rounded-xl p-4 bg-card border-border">
            <div className="font-medium">Budsjett</div>
            <div className="opacity-70 mt-1">Estimat vs. faktisk—se oversikt og unngå overskridelser.</div>
          </li>
          <li className="border rounded-xl p-4 bg-card border-border">
            <div className="font-medium">Dokumenter</div>
            <div className="opacity-70 mt-1">Trygg lagring av bilder, kvitteringer og fakturaer.</div>
          </li>
        </ul>

        <p className="text-xs opacity-60 mt-6">
          Built with Next.js, Supabase, TypeScript & Tailwind.
        </p>
      </div>
    </main>
  )
}
