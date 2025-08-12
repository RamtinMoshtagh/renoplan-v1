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

  const [{ data: rooms }, { data: budget }] = await Promise.all([
    supabase.from('rooms').select('id,name,sort').eq('project_id', project.id).order('sort', { ascending: true }),
    supabase.from('budget_items').select('name,amount_estimated,amount_actual,room_id').eq('project_id', project.id),
  ]);

  const total = Number(project.total_budget ?? 0);
  const est = (budget ?? []).reduce((s, b: any) => s + Number(b.amount_estimated ?? 0), 0);
  const act = (budget ?? []).reduce((s, b: any) => s + Number(b.amount_actual ?? 0), 0);
  const pctEst = total > 0 ? Math.min(100, Math.round((est / total) * 100)) : 0;
  const pctAct = total > 0 ? Math.min(100, Math.round((act / total) * 100)) : 0;

  // group budget per room
  const byRoom = new Map<string, { est: number; act: number }>();
  (budget ?? []).forEach((b: any) => {
    const key = b.room_id ?? 'unassigned';
    const entry = byRoom.get(key) ?? { est: 0, act: 0 };
    entry.est += Number(b.amount_estimated ?? 0);
    entry.act += Number(b.amount_actual ?? 0);
    byRoom.set(key, entry);
  });

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
            <CardDescription>Totals and progress</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Project total</div>
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
              <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctEst}>
                <div className="h-full bg-primary" style={{ width: `${pctEst}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">Actual {pctAct}%</div>
              <div className="h-2 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctAct}>
                <div className="h-full bg-primary" style={{ width: `${pctAct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ breakInside: 'avoid' }}>
          <CardHeader className="border-0 pb-0">
            <CardTitle className="text-base">Rooms overview</CardTitle>
            <CardDescription>Count and order</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            <div className="text-sm">Total rooms: <strong>{rooms?.length ?? 0}</strong></div>
            <ol className="list-decimal pl-5 text-sm grid md:grid-cols-2 gap-x-6">
              {(rooms ?? []).map((r, i) => (
                <li key={r.id} className="truncate">{i + 1}. {r.name}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Budget by room */}
      <Card style={{ breakInside: 'avoid' }}>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Budget by room</CardTitle>
          <CardDescription>Aggregate estimated vs actual</CardDescription>
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
                  const agg = byRoom.get(r.id) ?? { est: 0, act: 0 };
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3">kr {nok(agg.est)}</td>
                      <td className="px-4 py-3">kr {nok(agg.act)}</td>
                    </tr>
                  );
                })}
                {byRoom.has('unassigned') && (
                  <tr className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">Unassigned</td>
                    <td className="px-4 py-3">kr {nok(byRoom.get('unassigned')!.est)}</td>
                    <td className="px-4 py-3">kr {nok(byRoom.get('unassigned')!.act)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
