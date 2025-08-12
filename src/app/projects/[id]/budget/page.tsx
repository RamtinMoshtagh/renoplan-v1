import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nok } from '@/lib/numbers';

type BudgetItem = {
  id: string;
  name: string | null;
  amount_estimated: number | null;
  amount_actual: number | null;
  room_id: string | null;
};

type RoomRow = { id: string; name: string | null };

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ room?: string; sort?: string; dir?: 'asc' | 'desc' }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const filterRoom = sp.room ?? 'all';
  const sortKey = sp.sort ?? 'created'; // 'created' | 'name' | 'est' | 'act' | 'room'
  const sortDir: 'asc' | 'desc' = sp.dir === 'desc' ? 'desc' : 'asc';

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, total_budget')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const [{ data: items }, { data: rooms }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('id,name,amount_estimated,amount_actual,room_id,created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }) as unknown as { data: (BudgetItem & { created_at?: string })[] | null },
    supabase.from('rooms').select('id,name').eq('project_id', project.id),
  ]);

  const roomName = new Map<string, string>();
  (rooms ?? []).forEach((r) => roomName.set(r.id, r.name ?? ''));

  // Filter by room (all | <roomId> | unassigned)
  let list = (items ?? []).filter((r) => {
    if (filterRoom === 'all') return true;
    if (filterRoom === 'unassigned') return !r.room_id;
    return r.room_id === filterRoom;
  });

  // Sort in-memory for simplicity
  list = list.sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    switch (sortKey) {
      case 'name': {
        const an = (a.name ?? '').toLowerCase();
        const bn = (b.name ?? '').toLowerCase();
        return an < bn ? -1 * dir : an > bn ? 1 * dir : 0;
      }
      case 'est': {
        const an = Number(a.amount_estimated ?? 0);
        const bn = Number(b.amount_estimated ?? 0);
        return an === bn ? 0 : an < bn ? -1 * dir : 1 * dir;
      }
      case 'act': {
        const an = Number(a.amount_actual ?? 0);
        const bn = Number(b.amount_actual ?? 0);
        return an === bn ? 0 : an < bn ? -1 * dir : 1 * dir;
      }
      case 'room': {
        const an = a.room_id ? (roomName.get(a.room_id) ?? '') : '~'; // unassigned goes first
        const bn = b.room_id ? (roomName.get(b.room_id) ?? '') : '~';
        return an.localeCompare(bn) * dir;
      }
      default:
        return 0; // created order from DB
    }
  });

  const sumEst = list.reduce((s, r) => s + Number(r.amount_estimated ?? 0), 0);
  const sumAct = list.reduce((s, r) => s + Number(r.amount_actual ?? 0), 0);

  // ===== Server actions =====
  async function addItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const name = String(formData.get('name') || '').trim() || null;

    const estRaw = String(formData.get('amount_estimated') || '').trim();
    const actRaw = String(formData.get('amount_actual') || '').trim();
    const amount_estimated = estRaw ? Number(estRaw.replace(/[^0-9.-]/g, '')) : null;
    const amount_actual = actRaw ? Number(actRaw.replace(/[^0-9.-]/g, '')) : null;

    const room_id = String(formData.get('room_id') || '') || null;

    await supa.from('budget_items').insert({
      project_id,
      name,
      amount_estimated,
      amount_actual,
      room_id,
    });

    revalidatePath(`/projects/${project_id}/budget`);
  }

  async function updateItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    const name = (formData.get('name') as string | null)?.trim() ?? undefined;

    const estRaw = String(formData.get('amount_estimated') ?? '');
    const actRaw = String(formData.get('amount_actual') ?? '');
    const amount_estimated = estRaw === '' ? undefined : Number(estRaw.replace(/[^0-9.-]/g, ''));
    const amount_actual = actRaw === '' ? undefined : Number(actRaw.replace(/[^0-9.-]/g, ''));

    const room_id_val = String(formData.get('room_id') ?? '');
    const room_id = room_id_val === '' ? null : room_id_val;

    const patch: Record<string, any> = {};
    if (name !== undefined) patch.name = name || null;
    if (amount_estimated !== undefined) patch.amount_estimated = isNaN(amount_estimated) ? null : amount_estimated;
    if (amount_actual !== undefined) patch.amount_actual = isNaN(amount_actual) ? null : amount_actual;
    patch.room_id = room_id;

    await supa.from('budget_items').update(patch).eq('id', id);
    revalidatePath(`/projects/${project_id}/budget`);
  }

  async function deleteItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    await supa.from('budget_items').delete().eq('id', id);
    revalidatePath(`/projects/${project_id}/budget`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Budget"
        description="View & edit estimates and actuals. Export CSV or print from the Report."
        actions={
          <>
            <Link href={`/projects/${id}`}><Button variant="secondary">Back to Overview</Button></Link>
            <Link href={`/projects/${id}/budget/export`}><Button>Export CSV</Button></Link>
          </>
        }
      />

      {/* Summary */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Project total and current spend</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Project total</div>
            <div className="text-lg font-semibold">kr {nok(Number(project.total_budget ?? 0))}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Estimated</div>
            <div className="text-lg font-semibold">kr {nok(sumEst)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Actual</div>
            <div className="text-lg font-semibold">kr {nok(sumAct)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Remaining (vs total)</div>
            <div className="text-lg font-semibold">
              kr {nok(Math.max(Number(project.total_budget ?? 0) - sumAct, 0))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar: filter + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Link href={`/projects/${id}/budget`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'all' ? 'font-semibold' : ''}`}>All</Link>
        <Link href={`/projects/${id}/budget?room=unassigned`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'unassigned' ? 'font-semibold' : ''}`}>Unassigned</Link>
        {(rooms ?? []).map((r) => (
          <Link
            key={r.id}
            href={`/projects/${id}/budget?room=${r.id}`}
            className={`text-sm underline-offset-4 hover:underline ${filterRoom === r.id ? 'font-semibold' : ''}`}
          >
            {r.name}
          </Link>
        ))}

        <span className="ml-4 text-sm text-muted-foreground">Sort:</span>
        {[
          { k: 'created', label: 'Created' },
          { k: 'name', label: 'Name' },
          { k: 'est', label: 'Estimated' },
          { k: 'act', label: 'Actual' },
          { k: 'room', label: 'Room' },
        ].map((s) => {
          const active = sortKey === s.k;
          const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc';
          const href = `/projects/${id}/budget?${new URLSearchParams({ room: filterRoom, sort: s.k, dir: active ? nextDir : sortDir })}`;
          return (
            <Link key={s.k} href={href} className={`text-sm underline-offset-4 hover:underline ${active ? 'font-semibold' : ''}`}>
              {s.label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </Link>
          );
        })}
      </div>

      {/* Quick add */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Quick add</CardTitle>
          <CardDescription>Add a new budget item</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form action={addItem} className="grid gap-2 md:grid-cols-[minmax(180px,2fr),140px,140px,220px,120px] items-end">
            <input type="hidden" name="project_id" value={project.id} />
            <label className="grid gap-1">
              <span className="text-sm font-medium">Name</span>
              <Input name="name" placeholder="e.g., Flooring" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Estimated (kr)</span>
              <Input name="amount_estimated" type="number" min="0" step="1" placeholder="0" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Actual (kr)</span>
              <Input name="amount_actual" type="number" min="0" step="1" placeholder="0" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Room</span>
              <select name="room_id" className="h-9 rounded-md border bg-background px-2">
                <option value="">Unassigned</option>
                {(rooms ?? []).map((r: RoomRow) => (
                  <option key={r.id} value={r.id}>{r.name ?? 'Untitled'}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      {/* List: table on md+, cards on mobile */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Estimated</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => (
                <tr key={row.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2">
                    <form action={updateItem} className="flex gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Input name="name" defaultValue={row.name ?? ''} className="h-9 w-[220px]" />
                      <Button size="sm" variant="outline">Save</Button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={updateItem} className="flex gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Input name="amount_estimated" type="number" defaultValue={row.amount_estimated ?? ''} className="h-9 w-[140px]" />
                      <Button size="sm" variant="outline">Save</Button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={updateItem} className="flex gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Input name="amount_actual" type="number" defaultValue={row.amount_actual ?? ''} className="h-9 w-[140px]" />
                      <Button size="sm" variant="outline">Save</Button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={updateItem} className="flex gap-2 items-center">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <select name="room_id" defaultValue={row.room_id ?? ''} className="h-9 rounded-md border bg-background px-2 w-[220px]">
                        <option value="">Unassigned</option>
                        {(rooms ?? []).map((r: RoomRow) => (
                          <option key={r.id} value={r.id}>{r.name ?? 'Untitled'}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline">Save</Button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={deleteItem}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Button size="sm" variant="outline">Delete</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr className="font-semibold">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right">Totals</td>
                <td className="px-4 py-3">kr {nok(sumEst)}</td>
                <td className="px-4 py-3">kr {nok(sumAct)}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Mobile list */}
      <div className="grid gap-2 md:hidden">
        {list.map((row, i) => (
          <Card key={row.id}>
            <CardHeader className="border-0 pb-0">
              <CardTitle className="text-sm">{row.name ?? `Item ${i + 1}`}</CardTitle>
              <CardDescription className="text-xs">
                {row.room_id ? (roomName.get(row.room_id) || 'Unknown room') : 'Unassigned'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              <form action={updateItem} className="grid grid-cols-2 gap-2">
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="id" value={row.id} />
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Estimated</span>
                  <Input name="amount_estimated" type="number" defaultValue={row.amount_estimated ?? ''} />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Actual</span>
                  <Input name="amount_actual" type="number" defaultValue={row.amount_actual ?? ''} />
                </label>
                <label className="col-span-2 grid gap-1">
                  <span className="text-xs text-muted-foreground">Room</span>
                  <select name="room_id" defaultValue={row.room_id ?? ''} className="h-9 rounded-md border bg-background px-2">
                    <option value="">Unassigned</option>
                    {(rooms ?? []).map((r: RoomRow) => (
                      <option key={r.id} value={r.id}>{r.name ?? 'Untitled'}</option>
                    ))}
                  </select>
                </label>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button size="sm" variant="outline">Save</Button>
                  <form action={deleteItem}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="id" value={row.id} />
                    <Button size="sm" variant="outline">Delete</Button>
                  </form>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
