import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TaskList from './TaskList';

type TaskRow = {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'done';
  notes: string | null;
  estimate_cost: number | null;
  actual_cost: number | null;
  created_at: string;
};

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id,name')
    .eq('id', id)
    .single();
  if (!project) notFound();

  const { data: room } = await supabase
    .from('rooms')
    .select('id,name,sort,project_id')
    .eq('id', roomId)
    .maybeSingle();
  if (!room || room.project_id !== project.id) notFound();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,status,notes,estimate_cost,actual_cost,created_at')
    .eq('project_id', project.id)
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  // Quick stats
  const total = tasks?.length ?? 0;
  const done = (tasks ?? []).filter(t => t.status === 'done').length;
  const inProgress = (tasks ?? []).filter(t => t.status === 'in_progress').length;
  const notStarted = total - done - inProgress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ===== Server actions =====
  async function renameRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    await supa.from('rooms').update({ name }).eq('id', room_id);
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`); 
    revalidatePath(`/projects/${project_id}/report`);

  }

  async function deleteRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    await supa.from('rooms').delete().eq('id', room_id);
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`); 
    revalidatePath(`/projects/${project_id}/report`);

  }

  async function addTask(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const title = String(formData.get('title') || '').trim();
    const notes = String(formData.get('notes') || '').trim() || null;
    const estimate_cost = Number(formData.get('estimate_cost') || 0) || 0;
    if (!title) return;
    await supa.from('tasks').insert({
      project_id,
      room_id,
      title,
      notes,
      estimate_cost,
      status: 'not_started',
    });
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`); 
    revalidatePath(`/projects/${project_id}/report`);

  }

  async function updateTaskStatus(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const task_id = String(formData.get('task_id'));
    const status = String(formData.get('status')) as TaskRow['status'];
    if (!['not_started', 'in_progress', 'done'].includes(status)) return;
    await supa.from('tasks').update({ status }).eq('id', task_id).eq('project_id', project_id);
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`); 
    revalidatePath(`/projects/${project_id}/report`);

  }

  async function updateTask(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const task_id = String(formData.get('task_id'));
    const title = String(formData.get('title') || '').trim();
    const notes = String(formData.get('notes') || '').trim() || null;
    const estimate_cost_raw = String(formData.get('estimate_cost') || '');
    const actual_cost_raw = String(formData.get('actual_cost') || '');
    const estimate_cost = estimate_cost_raw === '' ? null : Number(estimate_cost_raw);
    const actual_cost = actual_cost_raw === '' ? null : Number(actual_cost_raw);

    if (!title) return;
    await supa
      .from('tasks')
      .update({ title, notes, estimate_cost, actual_cost })
      .eq('id', task_id)
      .eq('project_id', project_id);

    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`);

  }

  async function deleteTask(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const task_id = String(formData.get('task_id'));
    await supa.from('tasks').delete().eq('id', task_id).eq('project_id', project_id);
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    revalidatePath(`/projects/${project_id}/rooms`);
    revalidatePath(`/projects/${project_id}`);
    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`); 
  }


  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={room.name}
        description="Create tasks, update status, and track progress for this room."
        actions={
          <Link href={`/projects/${id}/rooms`}>
            <Button>Back to Rooms</Button>
          </Link>
        }
      />

      <ResponsiveGrid min={320} gap="1rem">
        {/* Progress / Snapshot */}
        <Card className="md:col-span-2">
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Progress</CardTitle>
            <CardDescription>How far this room has come.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <span><span className="font-semibold">{done}</span> done</span>
                <span>• <span className="font-semibold">{inProgress}</span> in progress</span>
                <span>• <span className="font-semibold">{notStarted}</span> not started</span>
              </div>
              <div className="text-xs">{pct}%</div>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded bg-muted"
              aria-label="Room completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              role="progressbar"
            >
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Room settings */}
        <Card>
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Room settings</CardTitle>
            <CardDescription>Rename or delete this room.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <form action={renameRoom} className="flex flex-col sm:flex-row gap-2">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="room_id" value={room.id} />
              <Input name="name" defaultValue={room.name} className="flex-1" />
              <Button variant="outline">Save name</Button>
            </form>

            <form action={deleteRoom} className="no-print">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="room_id" value={room.id} />
              <Button variant="destructive">Delete room</Button>
            </form>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="md:col-span-2">
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Tasks</CardTitle>
            <CardDescription>Quick-add and manage tasks comfortably.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-4">
            {/* Quick add */}
            <form action={addTask} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="room_id" value={room.id} />
              <Input name="title" placeholder="Add a task…" className="flex-1" required />
              <Input name="estimate_cost" type="number" step="0.01" placeholder="Estimate (kr)" className="w-full sm:w-40" />
              <Button type="submit">Add</Button>
            </form>

            <TaskList
              projectId={project.id}
              roomId={room.id}
              initialTasks={(tasks ?? []) as TaskRow[]}
              updateStatusAction={updateTaskStatus}
              updateTaskAction={updateTask}
              deleteTaskAction={deleteTask}
            />
          </CardContent>
        </Card>

        {/* Keep placeholders for future room-level budget/docs */}
        <Card>
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Budget (room)</CardTitle>
            <CardDescription>Track estimates and actuals per room.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <EmptyState
              title="No budget items linked"
              description="When you add budget items per room, they’ll appear here."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/budget`}>
              <Button size="sm" variant="secondary">Open project budget</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Documents (room)</CardTitle>
            <CardDescription>Blueprints, photos, invoices — all in one place.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <EmptyState
              title="No documents yet"
              description="Upload documents for this room to keep everything organized."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link href={`/projects/${id}/documents`}>
              <Button size="sm" variant="secondary">Open project docs</Button>
            </Link>
          </CardFooter>
        </Card>
      </ResponsiveGrid>
    </div>
  );
}
