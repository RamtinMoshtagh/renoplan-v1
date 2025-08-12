import type { ReactNode } from 'react';
import ProjectHeader from '@/components/ProjectHeader';
import { createSupabaseServer } from '@/lib/supabase/server';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  // ✅ Await the Promise-based params
  const { id } = await params;

  const supabase = await createSupabaseServer();
  await supabase.auth.getUser();

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
