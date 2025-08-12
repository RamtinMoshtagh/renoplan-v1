import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServer();

  // RLS-protected: ensure a signed-in user
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult?.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const [{ data: items }, { data: rooms }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('id,name,amount_estimated,amount_actual,room_id')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('rooms')
      .select('id,name')
      .eq('project_id', id),
  ]);

  const roomName = new Map<string, string>();
  (rooms ?? []).forEach((r) => roomName.set(r.id, r.name ?? ''));

  const header = ['id', 'name', 'amount_estimated', 'amount_actual', 'room_id', 'room_name'];
  const rows = (items ?? []).map((r) => [
    r.id,
    r.name ?? '',
    String(r.amount_estimated ?? 0),
    String(r.amount_actual ?? 0),
    r.room_id ?? '',
    r.room_id ? (roomName.get(r.room_id) ?? '') : '',
  ]);

  const csv = [header, ...rows]
    .map((line) =>
      line
        .map((cell) => {
          const s = String(cell ?? '');
          const needsQuote = /[",\n]/.test(s);
          const q = s.replace(/"/g, '""');
          return needsQuote ? `"${q}"` : q;
        })
        .join(',')
    )
    .join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="project-${id}-budget.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
