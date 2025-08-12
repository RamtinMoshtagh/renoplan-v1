import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServer();

  // RLS-friendly: ensure user session
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const [{ data: tasks }, { data: rooms }] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', id),
    supabase.from('rooms').select('id,name').eq('project_id', id),
  ]);

  const roomMap = new Map((rooms ?? []).map((r: any) => [r.id, r.name]));

  const rows = [
    ['id', 'title', 'status', 'room_id', 'room_name', 'estimate_cost', 'actual_cost', 'created_at'],
    ...(tasks ?? []).map((t: any) => [
      t.id,
      t.title ?? '',
      t.status ?? '',
      t.room_id ?? '',
      t.room_id ? roomMap.get(t.room_id) ?? '' : '',
      String(t.estimate_cost ?? ''),
      String(t.actual_cost ?? ''),
      t.created_at ?? '',
    ]),
  ];

  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="project-${id}-tasks.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
