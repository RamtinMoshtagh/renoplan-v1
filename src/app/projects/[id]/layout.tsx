// app/projects/[id]/layout.tsx
import type { ReactNode } from 'react';
import ProjectHeader from '@/components/ProjectHeader';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ✅ Persist refreshed tokens to cookies in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true });

  // Touch session (keeps it fresh; child pages handle redirects)
  await supabase.auth.getUser();

  // RLS will scope this to the signed-in user
  const { data: projects } = await supabase
    .from('projects')
    .select('id,name')
    .order('name', { ascending: true });

  return (
    <div className="min-h-dvh">
      <ProjectHeader projectId={id} projects={projects ?? []} />
      <main className="container py-4">{children}</main>
    </div>
  );
}
