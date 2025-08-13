// app/(app)/dashboard/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

// ✅ Import client components normally (they already have "use client")
import QuickCreateProject from '@/components/dashboard/QuickCreateProject';
import ProjectsGrid from '@/components/dashboard/ProjectsGrid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ProjectRow = {
  id: string;
  name: string | null;
  total_budget: number | null;
  progress?: number | null;
  created_at?: string | null;
  owner_id?: string | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { data: projectsRaw } = await supabase
    .from('projects')
    .select('id,name,total_budget,progress,created_at,owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const projects: ProjectRow[] = Array.isArray(projectsRaw) ? (projectsRaw as ProjectRow[]) : [];

  // ===== Server action: create a project (and redirect) =====
  async function createProject(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });
    const { data: { user: u } } = await supa.auth.getUser();
    if (!u) redirect('/login?next=/dashboard');

    const rawName = String(formData.get('name') || '').trim();
    const name = rawName || 'Untitled project';

    const totalBudgetRaw = String(formData.get('total_budget') || '').trim();
    const total_budget = Number(totalBudgetRaw.replace(/[^0-9.-]/g, '') || 0);

    const { data, error } = await supa
      .from('projects')
      .insert({ name, total_budget, owner_id: u.id })
      .select('id')
      .single();

    if (error || !data?.id) {
      revalidatePath('/dashboard');
      return;
    }

    redirect(`/projects/${data.id}`);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="My Projects"
        description="Create a new project or jump back into an existing one."
      />

      {/* Quick create */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Create a new project</CardTitle>
          <CardDescription>Name it now; you can tweak details later.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <QuickCreateProject action={createProject} />
        </CardContent>
      </Card>

      {/* Projects list */}
      {projects.length === 0 ? (
        <EmptyState
          className="mt-2"
          title="No projects yet"
          description="Create your first project above to start planning rooms, budget, tasks and documents."
          actions={
            <Link href="/projects" prefetch={false}>
              <Button>Open Projects</Button>
            </Link>
          }
        />
      ) : (
        <ProjectsGrid projects={projects} />
      )}
    </div>
  );
}
