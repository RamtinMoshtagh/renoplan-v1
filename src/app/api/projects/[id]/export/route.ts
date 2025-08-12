import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = params.id

  const [{ data: project }, { data: rooms }, { data: tasks }, { data: budget }, { data: documents }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('rooms').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('budget_items').select('*').eq('project_id', projectId),
    supabase.from('documents').select('*').eq('project_id', projectId),
  ])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dump = {
    meta: { exportedAt: new Date().toISOString(), projectId },
    project,
    rooms,
    tasks,
    budget,
    documents
  }

  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="renoplan_${project.name.replace(/\s+/g,'_')}.json"`
    }
  })
}
