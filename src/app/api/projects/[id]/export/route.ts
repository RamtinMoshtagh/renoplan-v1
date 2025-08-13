// app/api/projects/[id]/export/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const reqCookies = await cookies();
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return reqCookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const headers = new Headers(res.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const projectId = params.id;

  const [
    { data: project },
    { data: rooms },
    { data: tasks },
    { data: budget },
    { data: documents },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('rooms').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('budget_items').select('*').eq('project_id', projectId),
    supabase.from('documents').select('*').eq('project_id', projectId),
  ]);

  if (!project) {
    const headers = new Headers(res.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  }

  const dump = {
    meta: { exportedAt: new Date().toISOString(), projectId },
    project,
    rooms,
    tasks,
    budget,
    documents,
  };

  const headers = new Headers(res.headers);
  headers.set('content-type', 'application/json');
  headers.set('content-disposition', `attachment; filename="renoplan_${(project.name ?? 'project').replace(/\s+/g,'_')}.json"`);

  return new Response(JSON.stringify(dump, null, 2), { status: 200, headers });
}
