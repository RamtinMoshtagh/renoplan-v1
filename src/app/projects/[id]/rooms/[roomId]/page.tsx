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

export default async function RoomDetailPage({ params }: { params: { id: string; roomId: string } }) {
  const { id, roomId } = params;
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

  const { data: allRooms } = await supabase
    .from('rooms')
    .select('id,sort')
    .eq('project_id', project.id)
    .order('sort', { ascending: true });

  const idx = allRooms?.findIndex(r => r.id === room.id) ?? -1;

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
    revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={room.name}
        description="Room details and actions."
        actions={
          <>
            <form action={moveRoom}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="dir" value="up" />
              <Button variant="outline" size="sm" title="Move up" disabled={idx <= 0}>Move up</Button>
            </form>
            <form action={moveRoom}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="dir" value="down" />
              <Button variant="outline" size="sm" title="Move down" disabled={idx === (allRooms?.length ?? 1) - 1}>Move down</Button>
            </form>
            <Link href={`/projects/${id}/rooms`}><Button>Back to Rooms</Button></Link>
          </>
        }
      />

      <ResponsiveGrid min={320} gap="1rem">
        {/* Basic info + rename/delete */}
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

        {/* Placeholder modules we can wire later (budget for room, docs, tasks, etc.) */}
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
            <Link href={`/projects/${id}/budget`}><Button size="sm" variant="secondary">Open project budget</Button></Link>
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
            <Link href={`/projects/${id}/documents`}><Button size="sm" variant="secondary">Open project docs</Button></Link>
          </CardFooter>
        </Card>
      </ResponsiveGrid>
    </div>
  );
}
