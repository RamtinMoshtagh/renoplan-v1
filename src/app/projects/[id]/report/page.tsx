// src/app/projects/[id]/report/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintButton } from '@/components/PrintButton';
import { nok } from '@/lib/numbers';

type RoomRow = { id: string; name: string | null; sort: number };
type BudgetItem = { amount_estimated: number | null; amount_actual: number | null; room_id: string | null };
type TaskRow = {
  room_id: string | null;
  status: 'not_started' | 'in_progress' | 'done';
  estimate_cost: number | null;
  actual_cost: number | null;
};

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅ await Promise-based params

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (!project) notFound();

  const [{ data: rooms }, { data: items }, { data: tasks }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,name,sort')
      .eq('project_id', project.id)
      .order('sort', { ascending: true }) as unknown as { data: RoomRow[] | null },
    supabase
      .from('budget_items')
      .select('amount_estimated,amount_actual,room_id')
      .eq('project_id', project.id) as unknown as { data: BudgetItem[] | null },
    supabase
      .from('tasks')
      .select('room_id,status,estimate_cost,actual_cost')
      .eq('project_id', project.id) as unknown as { data: TaskRow[] | null },
  ]);

  const totalBudget = Number(project.total_budget ?? 0);

  // ----- Totals: items + tasks combined -----
  const estItems = (items ?? []).reduce((s, b) => s + Number(b.amount_estimated ?? 0), 0);
  const actItems = (items ?? []).reduce((s, b) => s + Number(b.amount_actual ?? 0), 0);
  const estTasks = (tasks ?? []).reduce((s, t) => s + Number(t.estimate_cost ?? 0), 0);
  const actTasks = (tasks ?? []).reduce((s, t) => s + Number(t.actual_cost ?? 0), 0);

  const est = estItems + estTasks;
  const act = actItems + actTasks;

  const pctEst = totalBudget > 0 ? Math.min(100, Math.round((est / totalBudget) * 100)) : 0;
  const pctAct = totalBudget > 0 ? Math.min(100, Math.round((act / totalBudget) * 100)) : 0;

  // ----- Budget by room (items + tasks) -----
  const byRoomBudget = new Map<string, { est: number; act: number }>();
  function addBudget(roomId: string | null, estVal: number, actVal: number) {
    const key = roomId ?? 'unassigned';
    const curr = byRoomBudget.get(key) ?? { est: 0, act: 0 };
    curr.est += estVal;
    curr.act += actVal;
    byRoomBudget.set(key, curr);
  }
  (items ?? []).forEach((b) => addBudget(b.room_id, Number(b.amount_estimated ?? 0), Number(b.amount_actual ?? 0)));
  (tasks ?? []).forEach((t) => addBudget(t.room_id, Number(t.estimate_cost ?? 0), Number(t.actual_cost ?? 0)));

  // ----- Task progress (overall + per-room) -----
  const progressByRoom = new Map<string, { total: number; done: number; in_progress: number; not_started: number }>();
  function bumpProgress(roomId: string | null, status: TaskRow['status']) {
    const key = roomId ?? 'unassigned';
    const curr = progressByRoom.get(key) ?? { total: 0, done: 0, in_progress: 0, not_started: 0 };
    curr.total += 1;
    if (status === 'done') curr.done += 1;
    else if (status === 'in_progress') curr.in_progress += 1;
    else curr.not_started += 1;
    progressByRoom.set(key, curr);
  }
  (tasks ?? []).forEach((t) => bumpProgress(t.room_id, t.status));

  const overall = Array.from(progressByRoom.values()).reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      done: acc.done + p.done,
      in_progress: acc.in_progress + p.in_progress,
      not_started: acc.not_started + p.not_started,
    }),
    { total: 0, done: 0, in_progress: 0, not_started: 0 }
  );
  const overallPct = overall.total ? Math.round((overall.done / overall.total) * 100) : 0;

  return (
    <div className="space-y-4 md:space-y-6 print:p-0">
      <PageHeader
        title={`Project report — ${project.name ?? project.id}`}
        description={new Date().toLocaleString()}
        actions={
          <>
            <Link href={`/projects/${id}`} className="no-print">
              <Button variant="secondary">Back</Button>
            </Link>
            <PrintButton>Print</PrintButton>
          </>
        }
      />

      {/* Summary */}
      <ResponsiveGrid min={320} gap="1rem">
  <Card style={{ breakInside: 'avoid' }}>
    <CardHeader className="border-0 pb-0">
      <CardTitle className="text-base">Budget summary</CardTitle>
      <CardDescription>Items + tasks combined</CardDescription>
    </CardHeader>
    <CardContent className="pt-3 space-y-3">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-md border p-3 md:min-w-0">
          <dt className="text-xs text-muted-foreground">Project total</dt>
          <dd className="text-lg md:text-xl font-semibold tabular-nums">
            kr {nok(totalBudget)}
          </dd>
        </div>
        <div className="rounded-md border p-3 md:min-w-0">
          <dt className="text-xs text-muted-foreground">Remaining</dt>
          <dd className="text-lg md:text-xl font-semibold tabular-nums">
            kr {nok(Math.max(totalBudget - act, 0))}
          </dd>
        </div>
      </dl>

      

      {/* Progress bars */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Estimated {pctEst}%</div>
        <div
          className="h-2 w-full overflow-hidden rounded bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctEst}
        >
          <div className="h-full bg-primary" style={{ width: `${pctEst}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">Actual {pctAct}%</div>
        <div
          className="h-2 w-full overflow-hidden rounded bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctAct}
        >
          <div className="h-full bg-primary" style={{ width: `${pctAct}%` }} />
        </div>
      </div>
    </CardContent>
  </Card>

        {/* Overall task progress */}
        <Card style={{ breakInside: 'avoid' }}>
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Task progress</CardTitle>
            <CardDescription>Across all rooms</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-lg font-semibold">{overall.total}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Done</div><div className="text-lg font-semibold">{overall.done}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">In progress</div><div className="text-lg font-semibold">{overall.in_progress}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Not started</div><div className="text-lg font-semibold">{overall.not_started}</div></div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{overallPct}% done</div>
              <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallPct}>
                <div className="h-full bg-primary" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Rooms overview (with per-room task progress) */}
      <Card style={{ breakInside: 'avoid' }}>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Rooms overview</CardTitle>
          <CardDescription>Order, names, and progress</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          <div className="text-sm">Total rooms: <strong>{rooms?.length ?? 0}</strong></div>
          <ul className="grid md:grid-cols-2 gap-3">
            {(rooms ?? []).map((r) => {
              const p = progressByRoom.get(r.id) ?? { total: 0, done: 0, in_progress: 0, not_started: 0 };
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <li key={r.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium flex-1 truncate">{r.name ?? 'Untitled room'}</span>
                    <span className="text-xs text-muted-foreground">{p.done}/{p.total}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          
        </CardContent>
      </Card>

      {/* Budget by room (combined) */}
      <Card style={{ breakInside: 'avoid' }}>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Budget by room</CardTitle>
          <CardDescription>Items + tasks, estimated vs actual</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Estimated</th>
                  <th className="px-4 py-3 font-medium">Actual</th>
                </tr>
              </thead>
              <tbody>
                {(rooms ?? []).map((r) => {
                  const agg = byRoomBudget.get(r.id) ?? { est: 0, act: 0 };
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3">kr {nok(agg.est)}</td>
                      <td className="px-4 py-3">kr {nok(agg.act)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
