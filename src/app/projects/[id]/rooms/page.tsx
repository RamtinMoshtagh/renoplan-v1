import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { RoomListDnD } from './RoomListDnD';

type RoomRow = { id: string; name: string; sort: number };
type TaskRow = { id: string; room_id: string | null; status: 'not_started'|'in_progress'|'done' };

export default async function RoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects').select('id,name').eq('id', id).single();
  if (!project) notFound();

  const [{ data: rooms }, { data: tasks }] = await Promise.all([
    supabase.from('rooms').select('id,name,sort').eq('project_id', project.id).order('sort', { ascending: true }),
    supabase.from('tasks').select('id,room_id,status').eq('project_id', project.id),
  ]);

  // ---- Per-room task progress (serializable) ----
  const progress: Record<string, { total: number; done: number; in_progress: number; not_started: number }> = {};
  for (const t of (tasks ?? []) as TaskRow[]) {
    const roomId = t.room_id;
    if (!roomId) continue;
    progress[roomId] ??= { total: 0, done: 0, in_progress: 0, not_started: 0 };
    progress[roomId].total += 1;
    if (t.status === 'done') progress[roomId].done += 1;
    else if (t.status === 'in_progress') progress[roomId].in_progress += 1;
    else progress[roomId].not_started += 1;
  }

  // ===== Server actions =====
  async function addRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const name = String(formData.get('name') || '').trim();
    if (!name) return;

    const { data: maxSort } = await supa
      .from('rooms').select('sort').eq('project_id', project_id)
      .order('sort', { ascending: false }).limit(1).maybeSingle();

    const sort = (maxSort?.sort ?? -1) + 1;
    await supa.from('rooms').insert({ project_id, name, sort });

    // Refresh cache + trigger a client transition so the new card appears
    revalidatePath(`/projects/${project_id}/rooms`);
    redirect(`/projects/${project_id}/rooms`);
  }

  async function reorderRooms(project_id: string, orderedIds: string[]) {
    'use server';
    const supa = await createSupabaseServer();
    if (!orderedIds?.length) return;

    const { data: projectRooms } = await supa.from('rooms').select('id').eq('project_id', project_id);
    const allowed = new Set((projectRooms ?? []).map((r) => r.id));
    const updates = orderedIds.map((roomId, idx) => ({ roomId, idx })).filter(({ roomId }) => allowed.has(roomId));

    for (const { roomId, idx } of updates) {
      const { error } = await supa.from('rooms').update({ sort: idx }).eq('id', roomId);
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/projects/${project_id}/rooms`);
  }

  // Force RoomListDnD to remount when the list changes (helps if it keeps local state)
  const roomsKey = (rooms ?? []).map(r => r.id).join('|');

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Rooms"
        description="Drag to reorder. Click a room to view details. Progress bars show completion."
        actions={<Link href={`/projects/${id}`}><Button variant="secondary">Back to Overview</Button></Link>}
      />

      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Add a room</CardTitle>
          <CardDescription>Name it and you can refine details later.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form action={addRoom} className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="project_id" value={project.id} />
            <Input name="name" placeholder="e.g., Kitchen" className="flex-1" required />
            <Button type="submit">Add room</Button>
          </form>
        </CardContent>
      </Card>

      {(rooms?.length ?? 0) === 0 ? (
        <EmptyState
          className="mt-2"
          title="No rooms yet"
          description="Start by adding your first room. You can reorder anytime."
        />
      ) : (
        <RoomListDnD
          key={roomsKey}
          projectId={project.id}
          initialRooms={(rooms ?? []) as RoomRow[]}
          reorderAction={reorderRooms}
          showMoveButtons={false}
          showEditControls={false}
          progress={progress}
        />
      )}
    </div>
  );
}
