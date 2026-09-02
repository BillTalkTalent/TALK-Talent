'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileText, ClipboardList, Upload, Download, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export type ChapterDocument = {
  id: string
  title: string
  category: 'document' | 'minutes'
  file_path: string
  file_name: string
  created_at: string
  profiles: { full_name: string | null } | null
}

export default function ChapterDocumentsTab({
  chapterId,
  documents,
}: {
  chapterId: string
  documents: ChapterDocument[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'document' | 'minutes'>('document')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { toast.error('Choose a file first.'); return }

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const ext = file.name.split('.').pop()
    const path = `${chapterId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('chapter-documents').upload(path, file)
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any).from('chapter_documents').insert({
      chapter_id: chapterId,
      title: title.trim() || file.name,
      category,
      file_path: path,
      file_name: file.name,
      uploaded_by: user?.id,
    })
    setUploading(false)

    if (dbError) {
      toast.error('Failed to save document.')
      return
    }

    toast.success('Uploaded.')
    setTitle('')
    setCategory('document')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  async function handleDownload(doc: ChapterDocument) {
    setDownloading(doc.id)
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('chapter-documents').createSignedUrl(doc.file_path, 300)
    setDownloading(null)
    if (error || !data) {
      toast.error('Could not generate a download link.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: ChapterDocument) {
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return
    setDeleting(doc.id)
    const supabase = createClient()
    await supabase.storage.from('chapter-documents').remove([doc.file_path])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('chapter_documents').delete().eq('id', doc.id)
    setDeleting(null)
    toast.success('Deleted.')
    router.refresh()
  }

  const minutes = documents.filter((d) => d.category === 'minutes')
  const other = documents.filter((d) => d.category === 'document')

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        Private to this chapter&apos;s leads and TALK admins — nothing here is visible to regular members.
      </p>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-dashed border-border p-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the filename"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-category">Type</Label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'document' | 'minutes')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="document">Document</option>
            <option value="minutes">Meeting minutes</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-file">File</Label>
          <input
            id="doc-file"
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={uploading || !file} className="gap-1.5">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>

      {/* Minutes */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <ClipboardList className="size-3.5" /> Meeting minutes {minutes.length > 0 && `(${minutes.length})`}
        </p>
        {minutes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No minutes uploaded yet.</p>
        ) : (
          <DocList docs={minutes} onDownload={handleDownload} onDelete={handleDelete} downloading={downloading} deleting={deleting} />
        )}
      </div>

      {/* Documents */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <FileText className="size-3.5" /> Documents {other.length > 0 && `(${other.length})`}
        </p>
        {other.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
        ) : (
          <DocList docs={other} onDownload={handleDownload} onDelete={handleDelete} downloading={downloading} deleting={deleting} />
        )}
      </div>
    </div>
  )
}

function DocList({
  docs, onDownload, onDelete, downloading, deleting,
}: {
  docs: ChapterDocument[]
  onDownload: (doc: ChapterDocument) => void
  onDelete: (doc: ChapterDocument) => void
  downloading: string | null
  deleting: string | null
}) {
  return (
    <div className="divide-y divide-border/60">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {doc.profiles?.full_name ?? 'Unknown'} · {format(new Date(doc.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => onDownload(doc)}
            disabled={downloading === doc.id}
            title="Download"
            className={cn('p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50')}
          >
            {downloading === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </button>
          <button
            onClick={() => onDelete(doc)}
            disabled={deleting === doc.id}
            title="Delete"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
