import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { RoomListDnD } from './RoomListDnD';

type RoomRow = { id: string; name: string; sort: number };

export default async function RoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id,name')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id,name,sort')
    .eq('project_id', project.id)
    .order('sort', { ascending: true });

  // ===== Server actions (unchanged) =====
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
    revalidatePath(`/projects/${project_id}/rooms`);
  }

  async function renameRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    await supa.from('rooms').update({ name }).eq('id', room_id);
    revalidatePath(`/projects/${project_id}/rooms`);
  }

  async function deleteRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    await supa.from('rooms').delete().eq('id', room_id);
    revalidatePath(`/projects/${project_id}/rooms`);
  }

  async function moveRoom(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id'));
    const dir = String(formData.get('dir')) as 'up' | 'down';

    const { data: current } = await supa.from('rooms').select('id,sort').eq('id', room_id).single();
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
    revalidatePath(`/projects/${project_id}/rooms`);
  }

  async function reorderRooms(project_id: string, orderedIds: string[]) {
    'use server';
    const supa = await createSupabaseServer();
    if (!orderedIds?.length) return;

    const { data: projectRooms } = await supa
      .from('rooms')
      .select('id')
      .eq('project_id', project_id);

    const allowed = new Set((projectRooms ?? []).map((r) => r.id));
    const updates = orderedIds.map((roomId, idx) => ({ roomId, idx })).filter(({ roomId }) => allowed.has(roomId));

    for (const { roomId, idx } of updates) {
      const { error } = await supa.from('rooms').update({ sort: idx }).eq('id', roomId);
      if (error) throw new Error(error.message);
    }

    revalidatePath(`/projects/${project_id}/rooms`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Rooms"
        description="Drag to reorder. You can still use the move buttons or rename/delete."
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
          description="Start by adding your first room. You can reorder, rename and delete anytime."
        />
      ) : (
        <RoomListDnD
          projectId={project.id}
          initialRooms={(rooms ?? []) as RoomRow[]}
          onReorder={reorderRooms}
          moveUpAction={moveRoom}
          moveDownAction={moveRoom}
          renameAction={renameRoom}
          deleteAction={deleteRoom}
        />
      )}
    </div>
  );
}
