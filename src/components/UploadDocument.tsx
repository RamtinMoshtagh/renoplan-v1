'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function UploadDocument({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'receipt'|'invoice'|'photo'|'note'|'other'>('photo')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title) { toast.error('Title and file required'); return }
    setLoading(true)
    const supabase = supabaseBrowser()
    const path = `${projectId}/${Date.now()}_${file.name}`

    const { data: upData, error: upErr } = await supabase.storage
      .from('project-docs')
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: '3600',
      })

    if (upErr) {
      console.error('upload error:', upErr)
      toast.error(upErr.message || 'Upload failed (storage)')
      setLoading(false)
      return
    }

    const { error: dbErr } = await supabase
      .from('documents')
      .insert({ project_id: projectId, type, title, file_path: upData?.path || path })

    if (dbErr) {
      console.error('db insert error:', dbErr)
      toast.error(dbErr.message || 'Could not save document')
      setLoading(false)
      return
    }

    toast.success('Uploaded')
    setLoading(false)
    setTitle(''); setFile(null)
    router.refresh()
  }

  return (
    <form onSubmit={handleUpload} className="grid sm:grid-cols-5 gap-2">
      <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="sm:col-span-2" required />
      <select value={type} onChange={e=>setType(e.target.value as any)} className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <option value="photo">Photo</option>
        <option value="receipt">Receipt</option>
        <option value="invoice">Invoice</option>
        <option value="note">Note</option>
        <option value="other">Other</option>
      </select>
      <input
        type="file"
        accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif"
        onChange={e=>setFile(e.target.files?.[0] ?? null)}
        className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-neutral-50 file:px-3 dark:border-neutral-800 dark:bg-neutral-900"
        required
      />
      <Button disabled={loading} type="submit">{loading ? 'Uploading…' : 'Upload'}</Button>
    </form>
  )
}
