// app/api/projects/[id]/budget/export/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  const reqCookies = await cookies();
  const base = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return reqCookies.get(name)?.value;
        },
        set(name, value, options) {
          base.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          base.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const h = new Headers(base.headers);
    h.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: h,
    });
  }

  const { data: items, error } = await supabase
    .from('budget_items')
    .select('id,category,amount_estimated,amount_actual,notes,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    const h = new Headers(base.headers);
    h.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: h,
    });
  }

  const header = [
    'id',
    'category',
    'amount_estimated',
    'amount_actual',
    'notes',
    'created_at',
  ];
  const rows = (items ?? []).map((r) => [
    r.id,
    r.category ?? '',
    String(r.amount_estimated ?? 0),
    String(r.amount_actual ?? 0),
    r.notes ?? '',
    (r as any).created_at ?? '',
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

  const h = new Headers(base.headers);
  h.set('content-type', 'text/csv; charset=utf-8');
  h.set(
    'content-disposition',
    `attachment; filename="project-${projectId}-budget.csv"`
  );
  h.set('cache-control', 'no-store');

  return new Response(csv, { status: 200, headers: h });
}
