// app/projects/new/page.tsx
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewProject() {
  // ✅ Ensure only signed-in users can access this page
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/projects/new');
  }

  // ===== Server action: create a project =====
  async function create(formData: FormData) {
    'use server';

    // Allow cookie writes so any token refresh during the action persists in prod
    const supa = await createSupabaseServer({ allowCookieWrite: true });

    const rawName = String(formData.get('name') ?? '').trim();
    if (!rawName) {
      redirect('/projects/new'); // simple guard; you could surface a toast client-side instead
    }

    // Be lenient with numbers (strip currency/commas/spaces)
    const rawBudget = String(formData.get('budget') ?? '').trim();
    const total_budget = Number(rawBudget.replace(/[^0-9.-]/g, '') || 0);

    // owner_id will be set by your DB trigger to auth.uid() if omitted
    const { error } = await supa.from('projects').insert({ name: rawName, total_budget });

    // Either way, revalidate and bounce back to dashboard
    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

  return (
    <form
      action={create}
      className="max-w-md mx-auto p-6 space-y-4 bg-rp.card border border-rp.border rounded-2xl mt-10"
    >
      <h1 className="text-xl font-semibold">New Project</h1>
      <input
        name="name"
        placeholder="Project name"
        className="w-full border border-rp.border rounded-xl p-3 bg-white/70"
        required
      />
      <input
        name="budget"
        placeholder="Total budget"
        type="number"
        inputMode="decimal"
        className="w-full border border-rp.border rounded-xl p-3 bg-white/70"
      />
      <button className="w-full rounded-xl bg-rp.accent text-white py-3">Create Project</button>
    </form>
  );
}
