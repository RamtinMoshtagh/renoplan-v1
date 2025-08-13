// app/projects/[id]/settings/page.tsx
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from '@/components/ui/dialog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ✅ Persist refreshed tokens to cookies in prod
  const supabase = await createSupabaseServer({ allowCookieWrite: true })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/projects/${id}/settings`)

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  // ===== actions =====
  async function rename(formData: FormData) {
    'use server'
    const supa = await createSupabaseServer({ allowCookieWrite: true })
    const project_id = String(formData.get('project_id'))
    const name = String(formData.get('name') || '').trim()
    if (!name) return
    await supa.from('projects').update({ name }).eq('id', project_id)
    revalidatePath(`/projects/${project_id}/settings`)
    revalidatePath('/dashboard')
  }

  async function toggleArchive(formData: FormData) {
    'use server'
    const supa = await createSupabaseServer({ allowCookieWrite: true })
    const project_id = String(formData.get('project_id'))
    const archived = formData.get('archived') === 'true'
    await supa.from('projects').update({ archived }).eq('id', project_id)
    revalidatePath(`/projects/${project_id}/settings`)
    revalidatePath('/dashboard')
  }

  async function remove(formData: FormData) {
    'use server'
    const supa = await createSupabaseServer({ allowCookieWrite: true })
    const project_id = String(formData.get('project_id'))

    // Child tables are ON DELETE CASCADE, but keeping explicit deletes is fine.
    await supa.from('documents').delete().eq('project_id', project_id)
    await supa.from('budget_items').delete().eq('project_id', project_id)
    await supa.from('tasks').delete().eq('project_id', project_id)
    await supa.from('rooms').delete().eq('project_id', project_id)
    await supa.from('projects').delete().eq('id', project_id)

    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Rename</CardTitle></CardHeader>
          <CardContent>
            <form action={rename} className="flex gap-2">
              <input type="hidden" name="project_id" value={project.id} />
              <Input name="name" defaultValue={project.name} className="flex-1" />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Archive</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm opacity-80">
              {project.archived ? 'This project is archived.' : 'Archive hides the project from the dashboard.'}
            </div>
            <form action={toggleArchive}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="archived" value={String(!project.archived)} />
              <Button variant="outline">{project.archived ? 'Unarchive' : 'Archive'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base text-red-600">Danger zone</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm opacity-80">
              Permanently deletes rooms, tasks, budget, and document metadata (files in storage remain).
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Delete project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete project</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. Are you sure you want to delete <strong>{project.name}</strong>?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <form action={remove}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <Button variant="destructive">Yes, delete</Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
