import Link from 'next/link';
import { notFound } from 'next/navigation';
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

type RoomRow = { id: string; name: string | null; sort: number };

export default async function ProjectOverviewPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ Await Promise-based params
  const supabase = await createSupabaseServer();
  await supabase.auth.getUser();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (!project) notFound();

  const [{ data: rooms }, { data: budget }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,name,sort')
      .eq('project_id', project.id)
      .order('sort', { ascending: true }),
    supabase
      .from('budget_items')
      .select('amount_estimated, amount_actual')
      .eq('project_id', project.id),
  ]);

  const est = (budget ?? []).reduce((s: number, b: any) => s + Number(b.amount_estimated ?? 0), 0);
  const act = (budget ?? []).reduce((s: number, b: any) => s + Number(b.amount_actual ?? 0), 0);
  const total = Number(project.total_budget ?? 0);
  const pctEst = total > 0 ? Math.min(100, Math.round((est / total) * 100)) : 0;
  const pctAct = total > 0 ? Math.min(100, Math.round((act / total) * 100)) : 0;

  // ===== Server actions =====
  async function addRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
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

  async function renameRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    await supa.from('rooms').update({ name }).eq('id', room_id);
    revalidatePath(`/projects/${project_id}`);
  }

  async function deleteRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    await supa.from('rooms').delete().eq('id', room_id);
    revalidatePath(`/projects/${project_id}`);
  }

  async function moveRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const dir = String(formData.get('dir')) as 'up' | 'down';

    const { data: current } = await supa
      .from('rooms')
      .select('id,sort')
      .eq('id', room_id)
      .single();
    if (!current) return;

    const neighborUp = await supa
      .from('rooms')
      .select('id,sort')
      .eq('project_id', project_id)
      .lt('sort', current.sort)
      .order('sort', { ascending: false })
      .limit(1)
      .maybeSingle();

    const neighborDown = await supa
      .from('rooms')
      .select('id,sort')
      .eq('project_id', project_id)
      .gt('sort', current.sort)
      .order('sort', { ascending: true })
      .limit(1)
      .maybeSingle();

    const target = dir === 'up' ? neighborUp.data : neighborDown.data;
    if (!target) return;

    await supa.from('rooms').update({ sort: target.sort }).eq('id', current.id);
    await supa.from('rooms').update({ sort: current.sort }).eq('id', target.id);

    revalidatePath(`/projects/${project_id}`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Overview"
        description="Snapshot of your renovation project. Add rooms, track budget, and jump into details."
        actions={
          <>
            <Link href={`/projects/${id}/report`}><Button variant="secondary">Report</Button></Link>
            <Link href={`/projects/${id}/settings`}><Button>Settings</Button></Link>
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

            {/* Progress bars */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Estimated {pctEst}%</div>
              <div
                className="h-2 w-full overflow-hidden rounded bg-muted"
                aria-label="Estimated progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pctEst}
                role="progressbar"
              >
                <div className="h-full bg-primary" style={{ width: `${pctEst}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">Actual {pctAct}%</div>
              <div
                className="h-2 w-full overflow-hidden rounded bg-muted"
                aria-label="Actual progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pctAct}
                role="progressbar"
              >
                <div className="h-full bg-primary" style={{ width: `${pctAct}%` }} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/budget`}>
              <Button size="sm" variant="secondary">Open budget</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Rooms card */}
        <Card className="md:col-span-2 animate-in fade-in-50 slide-in-from-bottom-1">
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Rooms</CardTitle>
            <CardDescription>Add, rename, reorder, or delete rooms.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-3">
            <form action={addRoom} className="flex flex-col sm:flex-row gap-2">
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
              <ul className="auto-grid" style={{ ['--min-card' as any]: '260px' }}>
                {((rooms ?? []) as RoomRow[]).map((r, idx) => (
                  <li
                    key={r.id}
                    className="rounded-md border p-3 flex flex-col gap-2 card-elevated break-inside-avoid"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium flex-1 truncate">{r.name ?? 'Untitled room'}</span>

                      <div className="flex items-center gap-1">
                        <form action={moveRoom}>
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="room_id" value={r.id} />
                          <input type="hidden" name="dir" value="up" />
                          <Button type="submit" variant="outline" size="sm" title="Move up" disabled={idx === 0}>↑</Button>
                        </form>
                        <form action={moveRoom}>
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="room_id" value={r.id} />
                          <input type="hidden" name="dir" value="down" />
                          <Button type="submit" variant="outline" size="sm" title="Move down" disabled={idx === (rooms?.length ?? 1) - 1}>↓</Button>
                        </form>
                      </div>
                    </div>

                    <details className="group">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground underline">
                        Edit
                      </summary>
                      <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <form action={renameRoom} className="flex gap-2 w-full sm:w-auto">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="room_id" value={r.id} />
                          <Input name="name" defaultValue={r.name ?? ''} className="h-9 w-full sm:w-56" />
                          <Button variant="outline" size="sm">Save</Button>
                        </form>
                        <form action={deleteRoom}>
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="room_id" value={r.id} />
                          <Button variant="outline" size="sm">Delete</Button>
                        </form>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>

          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/rooms`}>
              <Button size="sm" variant="secondary">Manage all rooms</Button>
            </Link>
          </CardFooter>
        </Card>
      </ResponsiveGrid>
    </div>
  );
}
