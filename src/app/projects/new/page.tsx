import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default function NewProject() {
  async function create(formData: FormData) {
    'use server'
    const supabase = await createSupabaseServer()
    const name = String(formData.get('name') || '').trim()
    const total_budget = Number(formData.get('budget') || 0)
    if (!name) return
    await supabase.from('projects').insert({ name, total_budget })
    revalidatePath('/dashboard')
    redirect('/dashboard')
  }

  return (
    <form action={create} className="max-w-md mx-auto p-6 space-y-4 bg-rp.card border border-rp.border rounded-2xl mt-10">
      <h1 className="text-xl font-semibold">New Project</h1>
      <input name="name" placeholder="Project name" className="w-full border border-rp.border rounded-xl p-3 bg-white/70" required />
      <input name="budget" placeholder="Total budget" type="number" className="w-full border border-rp.border rounded-xl p-3 bg-white/70" />
      <button className="w-full rounded-xl bg-rp.accent text-white py-3">Create Project</button>
    </form>
  )
}
