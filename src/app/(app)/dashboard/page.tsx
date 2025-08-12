import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectProgress } from '@/components/ProjectProgress';
import { EmptyState } from '@/components/ui/empty-state';
import { nok } from '@/lib/numbers';

type ProjectRow = {
  id: string;
  name: string | null;
  total_budget: number | null;
  progress?: number | null;
  created_at?: string | null;
  owner_id?: string | null;
};

export default async function Dashboard() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // If not signed in, show a gentle nudge (dashboard is often gated anyway)
  if (!user) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="My Projects"
          description="Sign in to view and manage your projects."
          actions={
            <Link href="/auth/sign-in">
              <Button>Sign in</Button>
            </Link>
          }
        />
        <EmptyState
          title="No access"
          description="You need to sign in to see your dashboard."
        />
      </div>
    );
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id,name,total_budget,progress,created_at,owner_id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  // ===== Server action: create a project (and redirect) =====
  async function createProject(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const { data: { user: u } } = await supa.auth.getUser();
    if (!u) {
      redirect('/auth/sign-in');
    }

    const rawName = String(formData.get('name') || '').trim();
    const name = rawName || 'Untitled project';

    const totalBudgetRaw = String(formData.get('total_budget') || '').trim();
    const total_budget = Number(totalBudgetRaw.replace(/[^0-9.-]/g, '') || 0);

    const { data, error } = await supa
      .from('projects')
      .insert({ name, total_budget, owner_id: u.id })
      .select('id')
      .single();

    // Fall back to list refresh if insert failed
    if (error || !data?.id) {
      revalidatePath('/(app)/dashboard');
      return;
    }

    redirect(`/projects/${data.id}`);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="My Projects"
        description="Quickly create a new project or jump back into existing ones."
        actions={
          // Direct link to the Projects hub (with full create UI as well)
          <Link href="/projects">
            <Button variant="secondary">Open Projects</Button>
          </Link>
        }
      />

      {/* Quick create */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Create a new project</CardTitle>
          <CardDescription>Name it now; you can tweak details later.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form action={createProject} className="grid gap-3 md:grid-cols-[1fr,180px,120px] items-end">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Name</span>
              <Input name="name" placeholder="e.g., House renovation" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Total budget (kr)</span>
              <Input name="total_budget" type="number" min="0" step="1" placeholder="0" />
            </label>
            <div>
              <Button type="submit">Create project</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Projects list */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          className="mt-2"
          title="No projects yet"
          description="Create your first project above to start planning rooms, budget, tasks and documents."
          actions={
            <Link href="/projects">
              <Button>Open Projects</Button>
            </Link>
          }
        />
      ) : (
        <ResponsiveGrid min={280} gap="1rem">
          {(projects as ProjectRow[]).map((p) => (
            <Card key={p.id} interactive>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-base truncate">
                  {p.name ?? p.id.slice(0, 6)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Total budget</div>
                  <div className="text-lg font-semibold">kr {nok(Number(p.total_budget ?? 0))}</div>
                </div>
                <ProjectProgress percent={Number(p.progress ?? 0)} />
              </CardContent>
              <CardFooter className="flex gap-2 justify-end">
                <Link href={`/projects/${p.id}`}>
                  <Button size="sm">Open</Button>
                </Link>
                <Link href={`/projects/${p.id}/report`}>
                  <Button size="sm" variant="outline">Report</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </ResponsiveGrid>
      )}
    </div>
  );
}
