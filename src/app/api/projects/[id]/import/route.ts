// app/api/projects/[id]/import/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    const headers = new Headers(res.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { rooms = [], tasks = [], budget = [] /* documents skipped */ } = body ?? {};

  // Normalize payloads
  const roomsPayload = rooms.map((r: any) => ({
    name: r?.name ?? 'Room',
    project_id: projectId,
    sort: Number(r?.sort ?? 0),
  }));

  const tasksPayload = tasks.map((t: any) => ({
    project_id: projectId,
    room_id: null, // safer default
    title: t?.title ?? 'Task',
    status: ['not_started', 'in_progress', 'done'].includes(t?.status) ? t.status : 'not_started',
    estimate_cost: Number(t?.estimate_cost ?? 0),
    actual_cost: Number(t?.actual_cost ?? 0),
    notes: t?.notes ?? null,
  }));

  const budgetPayload = budget.map((b: any) => ({
    project_id: projectId,
    category: ['materials', 'labor', 'permits', 'fees', 'other'].includes(b?.category) ? b.category : 'other',
    amount_estimated: Number(b?.amount_estimated ?? 0),
    amount_actual: Number(b?.amount_actual ?? 0),
    notes: b?.notes ?? null,
  }));

  if (roomsPayload.length) await supabase.from('rooms').insert(roomsPayload);
  if (tasksPayload.length) await supabase.from('tasks').insert(tasksPayload);
  if (budgetPayload.length) await supabase.from('budget_items').insert(budgetPayload);

  const headers = new Headers(res.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
