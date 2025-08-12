import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/server';

import { PageHeader } from '@/components/layout/PageHeader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastLite } from '@/components/ui/toast-lite';

export const dynamic = 'force-dynamic';

type ListedFile = {
  name: string;
  updated_at?: string;
  metadata?: { size?: number; mimetype?: string };
};

const BUCKET = 'project-docs';

export default async function DocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ room?: string; toast?: string }>;
}) {
  // ✅ Await both params and searchParams (Next dynamic APIs)
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const filterRoom = sp.room ?? 'all';
  const toastMsg = sp.toast;

  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id,name')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id,name,sort')
    .eq('project_id', project.id)
    .order('sort', { ascending: true });

  // Helper: list a directory path (non-recursive)
  async function listPath(path: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(path, { limit: 500, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) return [] as ListedFile[];
    return (data ?? []) as ListedFile[];
  }

  // Build items from "general" + each room subfolder
  const generalFiles = await listPath(`${project.id}/general`);
  const perRoomFiles = await Promise.all(
    (rooms ?? []).map(async (r) => {
      const files = await listPath(`${project.id}/rooms/${r.id}`);
      return files.map((f) => ({ room: r, file: f }));
    })
  );

  type DocItem = {
    key: string;
    name: string;
    url: string | null;
    size: number;
    updated_at: string | null;
    room_id: string | null; // null => General
    room_name: string | null;
  };

  const items: DocItem[] = [];

  // General
  for (const f of generalFiles) {
    const key = `${project.id}/general/${f.name}`;
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(key, 3600);
    items.push({
      key,
      name: f.name,
      url: signed?.signedUrl ?? null,
      size: f.metadata?.size ?? 0,
      updated_at: f.updated_at ?? null,
      room_id: null,
      room_name: null,
    });
  }

  // Per-room
  for (const group of perRoomFiles) {
    for (const { room, file: f } of group) {
      const key = `${project.id}/rooms/${room.id}/${f.name}`;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(key, 3600);
      items.push({
        key,
        name: f.name,
        url: signed?.signedUrl ?? null,
        size: f.metadata?.size ?? 0,
        updated_at: f.updated_at ?? null,
        room_id: room.id,
        room_name: room.name,
      });
    }
  }

  // Filter by ?room=<id>|general
  const filtered =
    filterRoom === 'all'
      ? items
      : filterRoom === 'general'
      ? items.filter((x) => x.room_id === null)
      : items.filter((x) => x.room_id === filterRoom);

  // ===== Server actions =====
  async function uploadDocs(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id') || ''); // '' => general
    const files = formData.getAll('files') as File[];
    if (!files.length) {
      redirect(`/projects/${project_id}/documents?toast=No%20files%20selected`);
    }

    let uploaded = 0;
    for (const file of files) {
      if (!file || file.size === 0) continue;
      if (file.size > 20 * 1024 * 1024) continue; // 20MB guard

      const safeName = file.name.replace(/\s+/g, '-');
      const target =
        room_id && room_id !== 'general'
          ? `${project_id}/rooms/${room_id}/${Date.now()}-${safeName}`
          : `${project_id}/general/${Date.now()}-${safeName}`;

      const { error } = await supa.storage
        .from(BUCKET)
        .upload(target, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (!error) uploaded += 1;
    }

    revalidatePath(`/projects/${project_id}/documents`);
    const msg = uploaded > 0 ? `Uploaded%20${uploaded}%20file${uploaded > 1 ? 's' : ''}` : 'No%20files%20uploaded';
    redirect(`/projects/${project_id}/documents?toast=${msg}`);
  }

  async function deleteDoc(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer();
    const project_id = String(formData.get('project_id'));
    const key = String(formData.get('key') || '');
    if (!key.startsWith(`${project_id}/`)) {
      redirect(`/projects/${project_id}/documents?toast=Invalid%20file`);
    }

    const { error } = await supa.storage.from(BUCKET).remove([key]);
    revalidatePath(`/projects/${project_id}/documents`);
    redirect(`/projects/${project_id}/documents?toast=${error ? 'Delete%20failed' : 'Deleted%20file'}`);
  }

  // ===== UI =====
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Toast on first render if ?toast=... is present */}
      <ToastLite message={toastMsg} />

      <PageHeader
        title="Documents"
        description="Upload and manage project files per room or in a general folder."
        actions={<Link href={`/projects/${id}`}><Button variant="secondary">Back to Overview</Button></Link>}
      />

      {/* Upload */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Upload files</CardTitle>
          <CardDescription>PNG, JPG, PDF, CSV, DOCX, XLSX. Max 20MB per file.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          {/* Do NOT set encType/method; server actions handle it */}
          <form action={uploadDocs} className="grid gap-3 md:grid-cols-[1fr,220px,120px] items-start">
            <input type="hidden" name="project_id" value={project.id} />

            <div className="min-w-0">
              <Input name="files" type="file" multiple className="w-full" />
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium">Target</span>
              <select name="room_id" className="h-9 rounded-md border bg-background px-2">
                <option value="general">General (no room)</option>
                {(rooms ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>

            <div className="pt-6 md:pt-0">
              <Button type="submit">Upload</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Link href={`/projects/${id}/documents`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'all' ? 'font-semibold' : ''}`}>All</Link>
        <Link href={`/projects/${id}/documents?room=general`} className={`text-sm underline-offset-4 hover:underline ${filterRoom === 'general' ? 'font-semibold' : ''}`}>General</Link>
        {(rooms ?? []).map((r) => (
          <Link
            key={r.id}
            href={`/projects/${id}/documents?room=${r.id}`}
            className={`text-sm underline-offset-4 hover:underline ${filterRoom === r.id ? 'font-semibold' : ''}`}
          >
            {r.name}
          </Link>
        ))}
      </div>

      {/* Files */}
      {filtered.length === 0 ? (
        <EmptyState
          className="mt-2"
          title="No documents found"
          description={
            filterRoom === 'all'
              ? 'Upload files to see them here.'
              : filterRoom === 'general'
              ? 'No files in General. Upload to the General target above.'
              : 'No files for this room yet.'
          }
        />
      ) : (
        <ResponsiveGrid min={260} gap="1rem">
          {filtered.map((f) => {
            const isImage = f.name.match(/\.(png|jpe?g|webp|gif|bmp|svg)$/i);
            const isPdf = f.name.match(/\.pdf$/i);
            return (
              <Card key={f.key} density="compact" interactive>
                <CardHeader className="border-0 pb-0">
                  <CardTitle className="text-sm truncate">{f.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {f.room_name ?? 'General'}
                    {f.updated_at ? ` • ${new Date(f.updated_at).toLocaleDateString()}` : ''}
                    {` • ${(f.size / 1024).toFixed(1)} KB`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  {isImage && f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.name} className="w-full h-40 object-cover rounded-md border" />
                    </a>
                  ) : isPdf && f.url ? (
                    <div className="h-40 rounded-md border overflow-hidden bg-muted flex items-center justify-center text-xs">
                      <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                        Open PDF preview
                      </a>
                    </div>
                  ) : (
                    <div className="h-20 rounded-md border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                      No preview
                    </div>
                  )}

                  <div className="flex gap-2">
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary">Open</Button>
                      </a>
                    )}
                    <form action={deleteDoc}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="key" value={f.key} />
                      <Button size="sm" variant="outline">Delete</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ResponsiveGrid>
      )}
    </div>
  );
}
