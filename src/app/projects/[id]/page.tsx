// app/projects/[id]/page.tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nok } from '@/lib/numbers';

import { PageHeader } from '@/components/layout/PageHeader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { EmptyState } from '@/components/ui/empty-state';
import type { CSSProperties } from 'react';

type RoomRow = { id: string; name: string | null; sort: number };
type TaskRow = { id: string; room_id: string | null; status: 'not_started' | 'in_progress' | 'done' };
type BudgetItem = { amount_estimated: number | null; amount_actual: number | null };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ Persist refreshed tokens in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/projects/${id}`);
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single();

  if (!project) notFound();

  const [{ data: rooms }, { data: budget }, { data: projectTasks }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,name,sort')
      .eq('project_id', project.id)
      .order('sort', { ascending: true }),
    supabase
      .from('budget_items')
      .select('amount_estimated, amount_actual')
      .eq('project_id', project.id),
    supabase
      .from('tasks')
      .select('id,room_id,status')
      .eq('project_id', project.id),
  ]);

  // Budget
  const est = (budget ?? []).reduce((s: number, b: BudgetItem) => s + Number(b.amount_estimated ?? 0), 0);
  const act = (budget ?? []).reduce((s: number, b: BudgetItem) => s + Number(b.amount_actual ?? 0), 0);
  const total = Number(project.total_budget ?? 0);
  const pctEst = total > 0 ? Math.min(100, Math.round((est / total) * 100)) : 0;
  const pctAct = total > 0 ? Math.min(100, Math.round((act / total) * 100)) : 0;

  // Per-room task progress
  const progressByRoom = new Map<string, { total: number; done: number; in_progress: number; not_started: number }>();
  for (const t of (projectTasks ?? []) as TaskRow[]) {
    const roomId = t.room_id;
    if (!roomId) continue;
    if (!progressByRoom.has(roomId)) {
      progressByRoom.set(roomId, { total: 0, done: 0, in_progress: 0, not_started: 0 });
    }
    const agg = progressByRoom.get(roomId)!;
    agg.total += 1;
    if (t.status === 'done') agg.done += 1;
    else if (t.status === 'in_progress') agg.in_progress += 1;
    else agg.not_started += 1;
  }

  // Server action
  async function addRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });
    const project_id = String(formData.get('project_id'));
    const name = String(formData.get('name') || '').trim();
    if (!name) return;

    const { data: maxSort } = await supa
      .from('rooms')
      .select('sort')
      .eq('project_id', project_id)
      .order('sort', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort = (maxSort?.sort ?? -1) + 1;
    await supa.from('rooms').insert({ project_id, name, sort });
    revalidatePath(`/projects/${project_id}`);
  }

  const autoGridStyle: CSSProperties = { ['--min-card' as any]: '260px' };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Overview"
        description="Snapshot of your renovation project. Add rooms, track budget, and jump into details."
        actions={
          <>
            <Link href={`/projects/${id}/report`} prefetch={false}><Button variant="secondary">Report</Button></Link>
            <Link href={`/projects/${id}/settings`} prefetch={false}><Button>Settings</Button></Link>
          </>
        }
      />

      <ResponsiveGrid min={300} gap="1rem">
        {/* Budget card */}
        <Card className="animate-in fade-in-50 slide-in-from-bottom-1">
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Budget</CardTitle>
            <CardDescription>Project budget and progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">kr {nok(total)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Estimated</div>
                <div className="text-lg font-semibold">kr {nok(est)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Actual</div>
                <div className="text-lg font-semibold">kr {nok(act)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Remaining (vs total)</div>
                <div className="text-lg font-semibold">kr {nok(Math.max(total - act, 0))}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Estimated {pctEst}%</div>
              <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label="Estimated progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctEst}>
                <div className="h-full bg-primary" style={{ width: `${pctEst}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">Actual {pctAct}%</div>
              <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label="Actual progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctAct}>
                <div className="h-full bg-primary" style={{ width: `${pctAct}%` }} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/budget`} prefetch={false}>
              <Button size="sm" variant="secondary">Open budget</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Rooms card */}
        <Card className="md:col-span-2 animate-in fade-in-50 slide-in-from-bottom-1">
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Rooms</CardTitle>
            <CardDescription>Add, then click into a room to manage tasks and details.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-3">
            <form action={addRoom} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="project_id" value={project.id} />
              <Input name="name" placeholder="New room name" className="flex-1" required />
              <Button type="submit">Add</Button>
            </form>

            {(rooms?.length ?? 0) === 0 ? (
              <EmptyState
                title="No rooms yet"
                description="Create your first room to start organizing tasks, budget, and documents."
                actions={null}
                className="mt-2"
              />
            ) : (
              <ul className="auto-grid" style={autoGridStyle}>
                {((rooms ?? []) as RoomRow[]).map((r) => {
                  const agg = progressByRoom.get(r.id) ?? { total: 0, done: 0, in_progress: 0, not_started: 0 };
                  const pct = agg.total > 0 ? Math.round((agg.done / agg.total) * 100) : 0;

                  return (
                    <li key={r.id} className="card-elevated break-inside-avoid rounded-md border p-3">
                      <Link
                        href={`/projects/${id}/rooms/${r.id}`}
                        prefetch={false}
                        className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate font-medium">
                            {r.name ?? 'Untitled room'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{agg.done}/{agg.total} done</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-label="Room completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {agg.in_progress} in progress • {agg.not_started} not started
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>

          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/rooms`} prefetch={false}>
              <Button size="sm" variant="secondary">Manage all rooms</Button>
            </Link>
          </CardFooter>
        </Card>
      </ResponsiveGrid>
    </div>
  );
}
