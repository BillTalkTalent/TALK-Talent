'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Send, Save, Clock, Eye, EyeOff, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const NewsletterEditor = dynamic(() => import('@/components/newsletter-editor'), { ssr: false })

interface NewsletterFormProps {
  id?: string
  initialSubject?: string
  initialPreview?: string
  initialBody?: string
  memberCount: number
}

export default function NewsletterForm({
  id,
  initialSubject = '',
  initialPreview = '',
  initialBody = '',
  memberCount,
}: NewsletterFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(initialSubject)
  const [previewText, setPreviewText] = useState(initialPreview)
  const [body, setBody] = useState(initialBody)
  const [showPreview, setShowPreview] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [showScheduler, setShowScheduler] = useState(false)
  const [loading, setLoading] = useState<'save' | 'send' | 'schedule' | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function save() {
    setLoading('save')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, previewText, bodyHtml: body, action: 'save' }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to save'); return }
    showToast('success', 'Draft saved!')
    if (!id && data.id) router.replace(`/admin/newsletter/${data.id}`)
  }

  async function send() {
    if (!subject.trim()) { showToast('error', 'Subject is required'); return }
    if (!body.trim() || body === '<p></p>') { showToast('error', 'Body is required'); return }
    if (!confirm(`Send this newsletter to ${memberCount} members now?`)) return
    setLoading('send')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, previewText, bodyHtml: body, action: 'send' }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to send'); return }
    showToast('success', `Sent to ${data.recipientCount} members!`)
    setTimeout(() => router.push('/admin/newsletter'), 1500)
  }

  async function schedule() {
    if (!subject.trim()) { showToast('error', 'Subject is required'); return }
    if (!scheduleDate) { showToast('error', 'Pick a date'); return }
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`)
    setLoading('schedule')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, previewText, bodyHtml: body, action: 'schedule', scheduledFor }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to schedule'); return }
    showToast('success', `Scheduled for ${scheduledFor.toLocaleDateString()}!`)
    setTimeout(() => router.push('/admin/newsletter'), 1500)
  }

  // Next Monday helper
  const nextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Subject + preview text */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Subject line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="This week in TALK — May 12"
            className="text-base font-semibold"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview" className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Preview text <span className="text-zinc-400 normal-case font-normal">(shows in inbox beneath subject)</span>
          </Label>
          <Input
            id="preview"
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            placeholder="Here's what happened in the community this week…"
          />
        </div>
      </div>

      {/* Editor / Preview toggle */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-zinc-50">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Newsletter body</span>
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {showPreview ? <><EyeOff className="size-3.5" /> Edit</> : <><Eye className="size-3.5" /> Preview email</>}
          </button>
        </div>

        {showPreview ? (
          <div className="p-6 bg-[#f4f4f5]">
            {/* Email preview */}
            <div className="max-w-[560px] mx-auto">
              <div className="rounded-2xl overflow-hidden shadow-sm">
                {/* Email header */}
                <div style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)' }} className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-black text-white text-xl tracking-tight">TALK</span>
                  </div>
                  {subject && <p className="text-white/60 text-sm mt-2">{subject}</p>}
                </div>
                {/* Email body */}
                <div className="bg-white px-8 py-6">
                  <div
                    className="prose prose-sm max-w-none text-zinc-700"
                    dangerouslySetInnerHTML={{ __html: body || '<p class="text-zinc-400">No content yet…</p>' }}
                  />
                </div>
                {/* Email footer */}
                <div className="bg-zinc-50 px-8 py-5 text-center border-t border-zinc-100">
                  <p className="text-xs text-zinc-400">You&apos;re receiving this as a TALK community member.</p>
                  <p className="text-xs text-zinc-400 mt-1">© {new Date().getFullYear()} TALK Community</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <NewsletterEditor content={body} onChange={setBody} />
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={save}
            disabled={!!loading}
            className="gap-2"
          >
            {loading === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save draft
          </Button>

          <button
            type="button"
            onClick={() => setShowScheduler(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
          >
            <Clock className="size-4" />
            Schedule
          </button>

          <button
            type="button"
            onClick={send}
            disabled={!!loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)' }}
          >
            {loading === 'send' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send now to {memberCount} members
          </button>

          <span className="text-xs text-zinc-400 ml-auto">{memberCount} approved members will receive this</span>
        </div>

        {/* Scheduler */}
        {showScheduler && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">Date</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-40" />
                <button
                  type="button"
                  onClick={() => setScheduleDate(nextMonday())}
                  className="text-xs font-semibold text-[#00b894] hover:underline whitespace-nowrap"
                >
                  <Calendar className="size-3 inline mr-1" />Next Monday
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">Time</Label>
              <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-32" />
            </div>
            <button
              type="button"
              onClick={schedule}
              disabled={!!loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-[#0d0d0d] disabled:opacity-60 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
            >
              {loading === 'schedule' ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
              Confirm schedule
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
