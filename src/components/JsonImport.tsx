'use client'
import { useState } from 'react'

export default function JsonImport({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch(`/api/projects/${projectId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      })
      if (!res.ok) throw new Error(await res.text())
      alert('Import complete ✔')
      location.reload()
    } catch (err: any) {
      alert(err.message || 'Import failed')
    } finally {
      setLoading(false)
      e.currentTarget.value = ''
    }
  }

  return (
    <label className="px-3 py-1.5 rounded-xl border cursor-pointer">
      {loading ? 'Importing…' : 'Import JSON'}
      <input type="file" accept="application/json" onChange={onChange} className="hidden" />
    </label>
  )
}
