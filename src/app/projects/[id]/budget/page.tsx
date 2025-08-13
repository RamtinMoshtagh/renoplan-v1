// app/(app)/projects/[id]/budget/page.tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nok } from '@/lib/numbers';
import BudgetToolbar from './BudgetToolbar';

type BudgetItemRow = {
  id: string;
  category: 'materials' | 'labor' | 'permits' | 'fees' | 'other';
  notes: string | null;
  amount_estimated: number | null;
  amount_actual: number | null;
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
  room_id: string | null;      // tasks only (budget: always null)
  created_at: string;
  // budget-only extras
  _category?: BudgetItemRow['category'];
  _notes?: string | null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function titleCase(s: string) {
  return s.replace(/(^|\s|-|_)\w/g, (m) => m.toUpperCase()).replace(/[_-]/g, ' ');
}

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

  // Read session; allow cookie write so refreshed tokens persist in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}/budget`);

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, total_budget')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const [{ data: items }, { data: tasks }, { data: rooms }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('id,category,notes,amount_estimated,amount_actual,created_at')
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

  // Merge items + tasks (budget items have no room_id; show N/A/Unassigned)
  let combined: CombinedRow[] = [
    ...(items ?? []).map((i) => ({
      id: i.id,
      source: 'budget' as const,
      name: (i.notes?.trim() ? i.notes!.trim() : titleCase(i.category)),
      amount_estimated: i.amount_estimated,
      amount_actual: i.amount_actual,
      room_id: null, // budget items are not tied to rooms
      created_at: i.created_at,
      _category: i.category,
      _notes: i.notes ?? null,
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

  // Type filter
  if (typeFilter !== 'both') {
    combined = combined.filter((r) => r.source === typeFilter);
  }

  // Room filter (only meaningful for tasks)
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
        const an = a.source;
        const bn = b.source;
        return an < bn ? -1 * dir : an > bn ? 1 * dir : 0;
      }
      default: {
        const at = new Date(a.created_at).getTime();
        const bt = new Date(b.created_at).getTime();
        return at === bt ? 0 : at < bt ? -1 * dir : 1 * dir;
      }
    }
  });

  const sumEst = combined.reduce((s, r) => s + Number(r.amount_estimated ?? 0), 0);
  const sumAct = combined.reduce((s, r) => s + Number(r.amount_actual ?? 0), 0);

  // ===== Server actions (budget_items only) =====
  async function addItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });
    const project_id = String(formData.get('project_id'));
    const category = (formData.get('category') as BudgetItemRow['category']) || 'other';
    const notes = (formData.get('notes') as string | null)?.toString().trim() || null;

    const estRaw = String(formData.get('amount_estimated') || '').trim();
    const actRaw = String(formData.get('amount_actual') || '').trim();
    const amount_estimated = estRaw ? Number(estRaw.replace(/[^0-9.-]/g, '')) : null;
    const amount_actual = actRaw ? Number(actRaw.replace(/[^0-9.-]/g, '')) : null;

    await supa.from('budget_items').insert({
      project_id,
      category,
      notes,
      amount_estimated,
      amount_actual,
    });

    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`);
  }

  async function updateItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));

    const category = formData.get('category') as BudgetItemRow['category'] | null;
    const notesVal = (formData.get('notes') as string | null) ?? undefined;
    const notes = notesVal === null ? undefined : (notesVal?.trim() || null);

    const estRaw = String(formData.get('amount_estimated') ?? '');
    const actRaw = String(formData.get('amount_actual') ?? '');
    const amount_estimated = estRaw === '' ? undefined : Number(estRaw.replace(/[^0-9.-]/g, ''));
    const amount_actual = actRaw === '' ? undefined : Number(actRaw.replace(/[^0-9.-]/g, ''));

    const patch: Record<string, any> = {};
    if (category) patch.category = category;
    if (notes !== undefined) patch.notes = notes;
    if (amount_estimated !== undefined) patch.amount_estimated = isNaN(amount_estimated) ? null : amount_estimated;
    if (amount_actual !== undefined) patch.amount_actual = isNaN(amount_actual) ? null : amount_actual;

    await supa.from('budget_items').update(patch).eq('id', id);
    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`);
  }

  async function deleteItem(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });
    const project_id = String(formData.get('project_id'));
    const id = String(formData.get('id'));
    await supa.from('budget_items').delete().eq('id', id);
    revalidatePath(`/projects/${project_id}/budget`);
    revalidatePath(`/projects/${project_id}/report`);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Budget"
        description="Items and task costs combined. Edit budget items here; edit tasks in their room."
        actions={
          <>
            <Link href={`/projects/${id}`} prefetch={false}>
              <Button variant="secondary">Back to Overview</Button>
            </Link>
            <Link href={`/api/projects/${id}/budget/export`} prefetch={false}>
              <Button>Export CSV</Button>
            </Link>
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
                        <form action={updateItem} className="flex gap-2 items-center">
                          <input type="hidden" name="project_id" value={project.id} />
                          <input type="hidden" name="id" value={row.id} />
                          <Input name="notes" defaultValue={row._notes ?? ''} className="h-9 w-[260px]" placeholder="Notes / label" />
                          <select name="category" defaultValue={row._category ?? 'other'} className="h-9 rounded-md border bg-background px-2 w-[160px]">
                            <option value="materials">Materials</option>
                            <option value="labor">Labor</option>
                            <option value="permits">Permits</option>
                            <option value="fees">Fees</option>
                            <option value="other">Other</option>
                          </select>
                          <Button size="sm" variant="outline">Save</Button>
                        </form>
                      ) : (
                        <Link
                          href={`/projects/${id}/rooms/${row.room_id ?? ''}`}
                          prefetch={false}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.name}
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      {isBudget ? (
                        <form action={updateItem} className="flex gap-2 items-center">
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
                        <form action={updateItem} className="flex gap-2 items-center">
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
                      {/* Budget items have no room; tasks show room name */}
                      {isBudget ? (
                        <div className="text-muted-foreground">—</div>
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
                          prefetch={false}
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
                  {isBudget ? 'Item' : 'Task'} • {isBudget ? '—' : (row.room_id ? (roomName.get(row.room_id) || 'Unknown room') : 'Unassigned')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                {isBudget ? (
                  <>
                    {/* UPDATE budget item */}
                    <form action={updateItem} className="grid grid-cols-2 gap-2">
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="id" value={row.id} />
                      <label className="grid gap-1 col-span-2">
                        <span className="text-xs text-muted-foreground">Notes / label</span>
                        <Input name="notes" defaultValue={row._notes ?? ''} />
                      </label>
                      <label className="grid gap-1 col-span-2">
                        <span className="text-xs text-muted-foreground">Category</span>
                        <select name="category" defaultValue={row._category ?? 'other'} className="h-9 rounded-md border bg-background px-2">
                          <option value="materials">Materials</option>
                          <option value="labor">Labor</option>
                          <option value="permits">Permits</option>
                          <option value="fees">Fees</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-muted-foreground">Estimated</span>
                        <Input name="amount_estimated" type="number" defaultValue={row.amount_estimated ?? ''} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs text-muted-foreground">Actual</span>
                        <Input name="amount_actual" type="number" defaultValue={row.amount_actual ?? ''} />
                      </label>
                      <div className="col-span-2 flex gap-2 justify-end">
                        <Button size="sm" variant="outline">Save</Button>
                      </div>
                    </form>

                    {/* DELETE */}
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
