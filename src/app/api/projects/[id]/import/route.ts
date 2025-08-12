import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = params.id
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { rooms = [], tasks = [], budget = [], documents = [] } = body ?? {}

  // Append (no deletes). We ignore incoming ids and use current project id.
  const roomsPayload = rooms.map((r: any) => ({ name: r.name ?? 'Room', project_id: projectId, sort: r.sort ?? 0 }))
  const tasksPayload = tasks.map((t: any) => ({
    project_id: projectId,
    room_id: null, // safer; you could map by name if you want
    title: t.title ?? 'Task',
    status: ['not_started','in_progress','done'].includes(t.status) ? t.status : 'not_started',
    estimate_cost: Number(t.estimate_cost ?? 0),
    actual_cost: Number(t.actual_cost ?? 0),
    notes: t.notes ?? null
  }))
  const budgetPayload = budget.map((b: any) => ({
    project_id: projectId,
    category: ['materials','labor','permits','fees','other'].includes(b.category) ? b.category : 'other',
    amount_estimated: Number(b.amount_estimated ?? 0),
    amount_actual: Number(b.amount_actual ?? 0),
    notes: b.notes ?? null
  }))

  // Insert in order
  if (roomsPayload.length) await supabase.from('rooms').insert(roomsPayload)
  if (tasksPayload.length) await supabase.from('tasks').insert(tasksPayload)
  if (budgetPayload.length) await supabase.from('budget_items').insert(budgetPayload)
  // We do NOT import documents (files) automatically.

  return NextResponse.json({ ok: true })
}
