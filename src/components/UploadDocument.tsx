// components/UploadDocument.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Room = { id: string; name: string | null }

export default function UploadDocument({
  projectId,
  rooms = [],
  defaultRoom = 'general', // 'general' | <roomId>
  writeDbRow = true,       // set false if you want storage-only
}: {
  projectId: string
  rooms?: Room[]
  defaultRoom?: string
  writeDbRow?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<string>(defaultRoom)
  const [files, setFiles] = useState<FileList | null>(null)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const list = files ? Array.from(files) : []
    if (list.length === 0) { toast.error('Select at least one file'); return }

    setLoading(true)
    const supabase = supabaseBrowser()
    let uploaded = 0

    for (const file of list) {
      if (!file || file.size === 0) continue
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: over 20MB`); continue }

      const safe = file.name.replace(/\s+/g, '-')
      const key = target && target !== 'general'
        ? `${projectId}/rooms/${target}/${Date.now()}-${safe}`
        : `${projectId}/general/${Date.now()}-${safe}`

      const { data, error } = await supabase
        .storage
        .from('project-docs')
        .upload(key, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        })

      if (error) { toast.error(`${file.name}: ${error.message}`); continue }
      uploaded += 1

      if (writeDbRow) {
        // optional metadata row (keeps /api/projects/:id/export documents working)
        await supabase.from('documents').insert({
          project_id: projectId,
          type: 'other',
          title: safe,
          file_path: data?.path || key,
        })
      }
    }

    toast.success(uploaded > 0 ? `Uploaded ${uploaded} file${uploaded > 1 ? 's' : ''}` : 'No files uploaded')
    setLoading(false)
    setFiles(null)
    router.replace(`/projects/${projectId}/documents?toast=Uploaded%20${uploaded}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-[1fr,260px,120px] items-end">
      <div className="min-w-0">
        <Input type="file" multiple onChange={e => setFiles(e.currentTarget.files)} />
      </div>
      <label className="grid gap-1">
        <span className="text-sm font-medium md:sr-only">Target</span>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="general">General (no room)</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.name ?? 'Untitled'}</option>
          ))}
        </select>
      </label>
      <div>
        <Button type="submit" disabled={loading}>{loading ? 'Uploading…' : 'Upload'}</Button>
      </div>
    </form>
  )
}
