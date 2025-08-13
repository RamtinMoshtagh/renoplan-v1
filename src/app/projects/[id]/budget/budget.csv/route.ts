// app/projects/[id]/budget/budget.csv/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  // Read cookies from request & prep a response we can attach Set-Cookie to
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

  // Ensure auth (RLS will also enforce, but this makes errors explicit)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const headers = new Headers(base.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const { data: items, error } = await supabase
    .from('budget_items')
    .select('category,notes,amount_estimated,amount_actual,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    const headers = new Headers(base.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers,
    });
  }

  const rows = [
    ['category', 'notes', 'amount_estimated', 'amount_actual', 'created_at'],
    ...(items ?? []).map((b) => [
      b.category ?? '',
      b.notes ?? '',
      String(b.amount_estimated ?? ''),
      String(b.amount_actual ?? ''),
      (b as any).created_at ?? '',
    ]),
  ];

  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? '');
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');

  // Return CSV while preserving any Set-Cookie headers from Supabase
  const headers = new Headers(base.headers);
  headers.set('content-type', 'text/csv; charset=utf-8');
  headers.set(
    'content-disposition',
    `attachment; filename="project-${projectId}-budget.csv"`
  );
  headers.set('cache-control', 'no-store');

  return new Response(csv, { status: 200, headers });
}
