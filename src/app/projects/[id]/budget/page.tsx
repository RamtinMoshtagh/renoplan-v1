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
import BudgetToolbar from './BudgetToolbar';


type BudgetItemRow = {
  id: string;
  name: string | null;
  amount_estimated: number | null;
  amount_actual: number | null;
  room_id: string | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  estimate_cost: number | null;
  actual_cost: number | null;
  room_id: string | null;
  created_at: string;
};

type RoomRow = { id: string; name: string | null };

type CombinedRow = {
  id: string;
  source: 'budget' | 'task';
  name: string;
  amount_estimated: number | null;
  amount_actual: number | null;
  room_id: string | null;
  created_at: string;
};

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ room?: string; sort?: string; dir?: 'asc' | 'desc'; q?: string; type?: 'both' | 'budget' | 'task' }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
const filterRoom = (sp.room ?? 'all').toString();
const typeFilter = (sp.type ?? 'both') as 'both' | 'budget' | 'task';
const q = (sp.q ?? '').toString().trim().toLowerCase();
const sortKey = (sp.sort ?? 'created') as 'created' | 'name' | 'est' | 'act' | 'room' | 'type';
const sortDir: 'asc' | 'desc' = sp.dir === 'desc' ? 'desc' : 'asc';

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, total_budget')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const [{ data: items }, { data: tasks }, { data: rooms }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('id,name,amount_estimated,amount_actual,room_id,created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }) as unknown as { data: BudgetItemRow[] | null },
    supabase
      .from('tasks')
      .select('id,title,estimate_cost,actual_cost,room_id,created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }) as unknown as { data: TaskRow[] | null },
    supabase.from('rooms').select('id,name').eq('project_id', project.id),
  ]);

  const roomName = new Map<string, string>();
  (rooms ?? []).forEach((r) => roomName.set(r.id, r.name ?? ''));

  // Merge items + tasks
  let combined: CombinedRow[] = [
    ...(items ?? []).map((i) => ({
      id: i.id,
      source: 'budget' as const,
      name: i.name ?? '',
      amount_estimated: i.amount_estimated,
      amount_actual: i.amount_actual,
      room_id: i.room_id,
      created_at: i.created_at,
    })),
    ...(tasks ?? []).map((t) => ({
      id: t.id,
      source: 'task' as const,
      name: t.title,
      amount_estimated: t.estimate_cost,
      amount_actual: t.actual_cost,
      room_id: t.room_id,
      created_at: t.created_at,
    })),
  ];
    // --- Filters + search ---
  // Type filter
  if (typeFilter !== 'both') {
    combined = combined.filter((r) => r.source === typeFilter);
  }

  // Room filter
  combined = combined.filter((r) => {
    if (filterRoom === 'all') return true;
    if (filterRoom === 'unassigned') return !r.room_id;
    return r.room_id === filterRoom;
  });

  // Search by name
  if (q) {
    combined = combined.filter((r) => (r.name || '').toLowerCase().includes(q));
  }


  // Sort in-memory
    // Sort in-memory
  combined = combined.sort((a, b) => {
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
        const an = a.room_id ? (roomName.get(a.room_id) ?? '') : '~';
        const bn = b.room_id ? (roomName.get(b.room_id) ?? '') : '~';
        return an.localeCompare(bn) * dir;
      }
      case 'type': {
        // budget before task when asc
        const an = a.source;
        const bn = b.source;
        return an < bn ? -1 * dir : an > bn ? 1 * dir : 0;
      }
      default: {
        // 'created' by timestamp
        const at = new Date(a.created_at).getTime();
        const bt = new Date(b.created_at).getTime();
        return at === bt ? 0 : at < bt ? -1 * dir : 1 * dir;
      }
    }
  });


  const sumEst = combined.reduce((s, r) => s + Number(r.amount_estimated ?? 0), 0);
  const sumAct = combined.reduce((s, r) => s + Number(r.amount_actual ?? 0), 0);

  // ===== Server actions (only apply to budget_items) =====
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
    revalidatePath(`/projects/${project_id}/report`);
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
    revalidatePath(`/projects/${project_id}/report`);
  }

  async function deleteItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    await supa.from('budget_items').delete().eq('id', id);
    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Budget"
        description="Items and task costs combined. Edit budget items here; edit tasks in their room."
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
          <CardDescription>Project total and current spend (filtered)</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Project total</div>
            <div className="text-lg font-semibold">kr {nok(Number(project.total_budget ?? 0))}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Estimated (items + tasks)</div>
            <div className="text-lg font-semibold">kr {nok(sumEst)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Actual (items + tasks)</div>
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

     <BudgetToolbar
  rooms={(rooms ?? []) as RoomRow[]}
  initial={{
    room: filterRoom,
    type: typeFilter,
    q,
    sort: sortKey,
    dir: sortDir,
  }}
/>


      {/* Desktop table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Estimated</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((row, i) => {
                const isBudget = row.source === 'budget';
                return (
                  <tr key={`${row.source}-${row.id}`} className="border-b last:border-0 align-top">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">{isBudget ? 'Item' : 'Task'}</td>
                    <td className="px-4 py-2">
                      {isBudget ? (
                        <form action={updateItem} className="flex gap-2">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="id" value={row.id} />
                          <Input name="name" defaultValue={row.name ?? ''} className="h-9 w-[220px]" />
                          <Button size="sm" variant="outline">Save</Button>
                        </form>
                      ) : (
                        <Link
                          href={`/projects/${id}/rooms/${row.room_id ?? ''}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.name}
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {isBudget ? (
                        <form action={updateItem} className="flex gap-2">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="id" value={row.id} />
                          <Input name="amount_estimated" type="number" defaultValue={row.amount_estimated ?? ''} className="h-9 w-[140px]" />
                          <Button size="sm" variant="outline">Save</Button>
                        </form>
                      ) : (
                        <div>kr {nok(Number(row.amount_estimated ?? 0))}</div>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {isBudget ? (
                        <form action={updateItem} className="flex gap-2">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="id" value={row.id} />
                          <Input name="amount_actual" type="number" defaultValue={row.amount_actual ?? ''} className="h-9 w-[140px]" />
                          <Button size="sm" variant="outline">Save</Button>
                        </form>
                      ) : (
                        <div>kr {nok(Number(row.amount_actual ?? 0))}</div>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {isBudget ? (
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
                      ) : (
                        <div>{row.room_id ? (roomName.get(row.room_id) || 'Unknown room') : 'Unassigned'}</div>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {isBudget ? (
                        <form action={deleteItem}>
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="id" value={row.id} />
                          <Button size="sm" variant="outline">Delete</Button>
                        </form>
                      ) : (
                        <Link
                          href={`/projects/${id}/rooms/${row.room_id ?? ''}`}
                          className="text-sm underline-offset-4 hover:underline text-muted-foreground"
                        >
                          Edit in room
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr className="font-semibold">
                <td className="px-4 py-3" />
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
        {combined.map((row, i) => {
          const isBudget = row.source === 'budget';
          return (
            <Card key={`${row.source}-${row.id}`}>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-sm">
                  {row.name || (isBudget ? `Item ${i + 1}` : `Task ${i + 1}`)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBudget ? 'Item' : 'Task'} • {row.room_id ? (roomName.get(row.room_id) || 'Unknown room') : 'Unassigned'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                {isBudget ? (
                  <>
                    {/* UPDATE (budget item) */}
                    <form action={updateItem} className="grid grid-cols-2 gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <label className="grid gap-1 col-span-2">
                        <span className="text-xs text-muted-foreground">Name</span>
                        <Input name="name" defaultValue={row.name ?? ''} />
                      </label>
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
                      </div>
                    </form>

                    {/* DELETE (sibling, not nested) */}
                    <form action={deleteItem} className="flex justify-end">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <Button size="sm" variant="outline">Delete</Button>
                    </form>
                  </>
                ) : (
                  // Task row (read-only here)
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Estimated</div>
                      <div>kr {nok(Number(row.amount_estimated ?? 0))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Actual</div>
                      <div>kr {nok(Number(row.amount_actual ?? 0))}</div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Link
                        href={`/projects/${id}/rooms/${row.room_id ?? ''}`}
                        className="text-sm underline-offset-4 hover:underline text-muted-foreground"
                      >
                        Edit in room
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
