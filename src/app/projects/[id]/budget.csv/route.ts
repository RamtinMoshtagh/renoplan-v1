import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServer()

  const { data: items } = await (await supabase)
    .from('budget_items')
    .select('*')
    .eq('project_id', id)

  const rows = [
    ['category', 'notes', 'amount_estimated', 'amount_actual'],
    ...(items ?? []).map((b: any) => [
      b.category ?? '',
      b.notes ?? '',
      String(b.amount_estimated ?? ''),
      String(b.amount_actual ?? ''),
    ])
  ]

  const csv = rows.map(r =>
    r.map(v => {
      const s = String(v ?? '')
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  ).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="budget.csv"',
    },
  })
}
