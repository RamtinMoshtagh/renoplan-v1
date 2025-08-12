import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Empty from '@/components/Empty';
import { nok } from '@/lib/numbers';

type TaskRow = {
  id: string;
  project_id: string;
  room_id: string | null;
  title: string | null;
  status: 'not_started' | 'in_progress' | 'done' | string;
  estimate_cost: number | null;
  actual_cost: number | null;
  created_at?: string | null;
};

function statusBadge(status: string) {
  if (status === 'done') return <Badge variant="success">Done</Badge>;
  if (status === 'in_progress') return <Badge variant="warning">In progress</Badge>;
  return <Badge variant="secondary">Not started</Badge>;
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ room?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const filterRoom = sp.room ?? 'all'; // 'all' | <roomId> | 'unassigned'
  const filterStatus = sp.status ?? 'all'; // 'all' | 'not_started' | 'in_progress' | 'done'

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id,name')
    .eq('id', id)
    .single();
  if (!project) notFound();

  const [{ data: rooms }, { data: tasks }] = await Promise.all([
    supabase.from('rooms').select('id,name').eq('project_id', project.id).order('sort', { ascending: true }),
    supabase.from('tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: true }) as unknown as Promise<{
      data: TaskRow[] | null;
    }>,
  ]);

  const roomsById = new Map((rooms ?? []).map((r: any) => [r.id, r.name as string | null]));

  // Filter in-memory (simple & fast for typical sizes)
  let list = (tasks ?? []).filter((t) => {
    const roomOk =
      filterRoom === 'all'
        ? true
        : filterRoom === 'unassigned'
        ? !t.room_id
        : t.room_id === filterRoom;
    const statusOk = filterStatus === 'all' ? true : t.status === filterStatus;
    return roomOk && statusOk;
  });

  // Summary
  const total = list.length;
  const done = list.filter((t) => t.status === 'done').length;
  const inProgress = list.filter((t) => t.status === 'in_progress').length;
  const notStarted = total - done - inProgress;
  const sumEst = list.reduce((s, t) => s + Number(t.estimate_cost ?? 0), 0);
  const sumAct = list.reduce((s, t) => s + Number(t.actual_cost ?? 0), 0);

  // ===== Server actions =====
  async function addTask(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id') || '');
    const title = String(formData.get('title') || '').trim();
    const estimate_raw = String(formData.get('estimate_cost') || '').trim();
    const estimate_cost = estimate_raw ? Number(estimate_raw.replace(/[^0-9.-]/g, '')) : null;

    if (!title) return;
    await supa
      .from('tasks')
      .insert({ project_id, room_id: room_id || null, title, estimate_cost });

    revalidatePath(`/projects/${project_id}/tasks`);
  }

  async function setStatus(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    const status = String(formData.get('status')) as TaskRow['status'];
    await supa.from('tasks').update({ status }).eq('id', id);
    revalidatePath(`/projects/${project_id}/tasks`);
  }

  async function updateCosts(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));

    const estRaw = String(formData.get('estimate_cost') ?? '').trim();
    const actRaw = String(formData.get('actual_cost') ?? '').trim();
    const estimate_cost = estRaw === '' ? null : Number(estRaw.replace(/[^0-9.-]/g, ''));
    const actual_cost = actRaw === '' ? null : Number(actRaw.replace(/[^0-9.-]/g, ''));

    await supa.from('tasks').update({ estimate_cost, actual_cost }).eq('id', id);
    revalidatePath(`/projects/${project_id}/tasks`);
  }

  async function deleteTask(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    await supa.from('tasks').delete().eq('id', id);
    revalidatePath(`/projects/${project_id}/tasks`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Tasks"
        description="Track tasks per room, update status, and compare estimated vs actual costs."
        actions={
          <>
            <Link href={`/projects/${id}`}><Button variant="secondary">Back to Overview</Button></Link>
            <Link href={`/projects/${id}/tasks.csv`}><Button>Export CSV</Button></Link>
          </>
        }
      />

      {/* Summary */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Counts and cost totals (filtered)</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Tasks</div>
            <div className="text-lg font-semibold">{total}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Done</div>
            <div className="text-lg font-semibold">{done}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">In progress</div>
            <div className="text-lg font-semibold">{inProgress}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Not started</div>
            <div className="text-lg font-semibold">{notStarted}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Estimated</div>
            <div className="text-lg font-semibold">kr {nok(sumEst)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Actual</div>
            <div className="text-lg font-semibold">kr {nok(sumAct)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Add task */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Add task</CardTitle>
          <CardDescription>Create a task and optionally link it to a room.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form action={addTask} className="grid gap-2 sm:grid-cols-5 items-end">
            <input type="hidden" name="project_id" value={project.id} />
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Title</span>
              <Input name="title" placeholder="e.g., Order tiles" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Room</span>
              <select
                name="room_id"
                className="h-9 rounded-md border bg-background px-2"
                defaultValue=""
              >
                <option value="">No room</option>
                {(rooms ?? []).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Estimate (kr)</span>
              <Input name="estimate_cost" type="number" step="1" placeholder="0" />
            </label>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Room:</span>
        <Link href={`/projects/${id}/tasks`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'all' ? 'font-semibold' : ''}`}>All</Link>
        <Link href={`/projects/${id}/tasks?room=unassigned${filterStatus !== 'all' ? `&status=${filterStatus}` : ''}`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'unassigned' ? 'font-semibold' : ''}`}>Unassigned</Link>
        {(rooms ?? []).map((r: any) => (
          <Link
            key={r.id}
            href={`/projects/${id}/tasks?room=${r.id}${filterStatus !== 'all' ? `&status=${filterStatus}` : ''}`}
            className={`text-sm underline-offset-4 hover:underline ${filterRoom === r.id ? 'font-semibold' : ''}`}
          >
            {r.name}
          </Link>
        ))}

        <span className="ml-4 text-sm text-muted-foreground">Status:</span>
        {['all', 'not_started', 'in_progress', 'done'].map((s) => {
          const href = `/projects/${id}/tasks?room=${filterRoom}&status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={`text-sm underline-offset-4 hover:underline ${filterStatus === s ? 'font-semibold' : ''}`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {(list ?? []).length === 0 ? (
        <Empty>No tasks match your filters.</Empty>
      ) : (
        <ul className="grid gap-2">
          {list.map((t) => (
            <li key={t.id} className="rounded-md border p-3 bg-card text-card-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t.room_id ? roomsById.get(t.room_id) ?? '—' : '—'}
                </div>
                <div className="ml-auto">{statusBadge(t.status)}</div>
                <form action={deleteTask}>
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="id" value={t.id} />
                  <Button variant="outline" size="sm">Delete</Button>
                </form>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3 items-center">
                <form action={setStatus} className="flex items-center gap-2">
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="id" value={t.id} />
                  <select
                    name="status"
                    defaultValue={t.status}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                  <Button variant="outline" size="sm">Save</Button>
                </form>

                <form action={updateCosts} className="flex items-center gap-2">
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="id" value={t.id} />
                  <Input name="estimate_cost" defaultValue={t.estimate_cost ?? ''} type="number" step="1" className="w-28 h-9" />
                  <Input name="actual_cost" defaultValue={t.actual_cost ?? ''} type="number" step="1" className="w-28 h-9" />
                  <Button variant="outline" size="sm">Update</Button>
                </form>

                <div className="text-sm text-muted-foreground sm:text-right">
                  {t.actual_cost != null && t.actual_cost !== 0
                    ? `kr ${nok(Number(t.actual_cost))}`
                    : t.estimate_cost != null && t.estimate_cost !== 0
                    ? `~ kr ${nok(Number(t.estimate_cost))}`
                    : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
