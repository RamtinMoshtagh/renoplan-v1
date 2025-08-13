// app/projects/[id]/documents/page.tsx
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
import { formatDateYMD } from '@/lib/dates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ListedFile = {
  name: string;
  updated_at?: string;
  metadata?: { size?: number; mimetype?: string };
};

type RoomRow = { id: string; name: string; sort: number };

const BUCKET = 'project-docs';

export default async function DocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ q?: string; toast?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? '').toString().toLowerCase().trim();
  const toastMsg = sp.toast ?? undefined;

  // ✅ Allow cookie writes so any session refresh persists in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true });

  // Ensure user (also required by your storage RLS)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}/documents`);

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

  // ---------- helpers ----------
  async function listPath(path: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(path, { limit: 500, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) return [] as ListedFile[];
    return (data ?? []) as ListedFile[];
  }
  function prettySize(bytes?: number) {
    const b = Number(bytes ?? 0);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }
  function kindOf(name: string) {
    const n = name.toLowerCase();
    if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(n)) return 'image' as const;
    if (/\.pdf$/.test(n)) return 'pdf' as const;
    return 'other' as const;
  }

  // ---------- gather files ----------
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
    room_id: string | null;
    room_name: string | null;
    kind: 'image' | 'pdf' | 'other';
  };

  const items: DocItem[] = [];

  // general
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
      room_name: 'General',
      kind: kindOf(f.name),
    });
  }
  // per-room
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
        kind: kindOf(f.name),
      });
    }
  }

  // ---------- simple search (file name OR room name) ----------
  const searched = q
    ? items.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          (x.room_name ?? 'general').toLowerCase().includes(q)
      )
    : items;

  // ---------- group by room (General first, then rooms order) ----------
  const groups: { id: string | null; name: string; files: DocItem[] }[] = [];
  const pushGroup = (id: string | null, name: string) => {
    const files = searched.filter((x) => (id ? x.room_id === id : x.room_id === null));
    if (files.length) groups.push({ id, name, files });
  };

  pushGroup(null, 'General');
  for (const r of rooms ?? []) pushGroup(r.id, r.name);

  // ---------- actions ----------
  async function uploadDocs(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });

    const project_id = String(formData.get('project_id'));
    const room_id = String(formData.get('room_id') || ''); // '' or 'general' => general
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      redirect(`/projects/${project_id}/documents?toast=No%20files%20selected`);
    }

    let uploaded = 0;
    for (const file of files) {
      if (!file || file.size === 0) continue;
      if (file.size > 20 * 1024 * 1024) continue;

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
    if (room_id && room_id !== 'general') {
      revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    }

    const msg =
      uploaded > 0 ? `Uploaded%20${uploaded}%20file${uploaded > 1 ? 's' : ''}` : 'No%20files%20uploaded';
    redirect(`/projects/${project_id}/documents?toast=${msg}`);
  }

  async function deleteDoc(formData: FormData) {
    'use server';
    const supa = await createSupabaseServer({ allowCookieWrite: true });

    const project_id = String(formData.get('project_id'));
    const key = String(formData.get('key') || '');
    const room_id = String(formData.get('room_id') || '');

    if (!key.startsWith(`${project_id}/`)) {
      redirect(`/projects/${project_id}/documents?toast=Invalid%20file`);
    }

    await supa.storage.from(BUCKET).remove([key]);

    revalidatePath(`/projects/${project_id}/documents`);
    if (room_id && room_id !== 'general') {
      revalidatePath(`/projects/${project_id}/rooms/${room_id}`);
    }
    redirect(`/projects/${project_id}/documents?toast=Deleted%20file`);
  }

  // ---------- UI ----------
  return (
    <div className="space-y-4 md:space-y-6">
      <ToastLite message={toastMsg} />

      <PageHeader
        title="Documents"
        description="Upload and manage project files. Grouped by room."
        actions={
          <Link href={`/projects/${id}`}>
            <Button variant="secondary">Back to Overview</Button>
          </Link>
        }
      />

      {/* Upload */}
      <Card>
        <CardHeader className="border-0 pb-0">
          <CardTitle className="text-base">Upload files</CardTitle>
          <CardDescription>PNG, JPG, PDF, CSV, DOCX, XLSX. Max 20MB per file.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form action={uploadDocs} className="grid gap-3 md:grid-cols-[1fr,260px,120px] items-center">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="min-w-0">
              <Input name="files" type="file" multiple className="w-full" />
            </div>
            <label className="grid gap-1 md:block">
              <span className="text-sm font-medium md:sr-only">Target</span>
              <select name="room_id" className="h-9 rounded-md border bg-background px-2 w-full">
                <option value="general">General (no room)</option>
                {(rooms ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <div className="md:justify-self-start">
              <Button type="submit">Upload</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search */}
      <form method="GET" className="flex items-center gap-2">
        <Input
          name="q"
          placeholder="Search files or room…"
          defaultValue={q}
          className="h-9 w-64 sm:w-80"
        />
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {q && (
          <Link href={`/projects/${id}/documents`} className="text-sm underline ml-1">
            Clear
          </Link>
        )}
      </form>

      {/* Groups */}
      {groups.length === 0 ? (
        <EmptyState
          className="mt-2"
          title={q ? 'No results' : 'No documents yet'}
          description={q ? 'Try a different search.' : 'Upload files to see them here.'}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.id ?? 'general'}>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <CardDescription>{g.files.length} file{g.files.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-3">
                <ResponsiveGrid min={260} gap="1rem">
                  {g.files.map((f) => {
                    const isImage = f.kind === 'image';
                    const isPdf = f.kind === 'pdf';
                    return (
                      <Card key={f.key} density="compact" interactive>
                        <CardHeader className="border-0 pb-0">
                          <CardTitle className="text-sm truncate">{f.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {f.updated_at ? formatDateYMD(f.updated_at) : ''} • {prettySize(f.size)}
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
                                Open PDF
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
                              <input type="hidden" name="room_id" value={f.room_id ?? 'general'} />
                              <Button size="sm" variant="outline">Delete</Button>
                            </form>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </ResponsiveGrid>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
