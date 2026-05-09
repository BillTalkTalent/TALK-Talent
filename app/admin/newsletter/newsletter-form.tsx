'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Send, Save, Clock, Eye, EyeOff, Loader2,
  Calendar, ChevronDown, ChevronUp, Newspaper,
  Star, Globe, Briefcase, Building2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const NewsletterEditor = dynamic(() => import('@/components/newsletter-editor'), { ssr: false })

const SECTIONS = [
  { key: 'talk_news',          label: 'TALK News',            icon: Newspaper,  color: '#00b894', desc: 'Community updates, announcements, upcoming events' },
  { key: 'member_highlight',   label: 'Member Highlight',     icon: Star,       color: '#f59e0b', desc: 'Spotlight a member — their story, role, or advice' },
  { key: 'industry_news',      label: 'Industry News',        icon: Globe,      color: '#3b82f6', desc: 'TA trends, research, and what's happening out there' },
  { key: 'career_opportunities', label: 'Career Opportunities', icon: Briefcase, color: '#8b5cf6', desc: 'Curated jobs and opportunities worth sharing' },
  { key: 'vendor_highlight',   label: 'Vendor Highlight',     icon: Building2,  color: '#ec4899', desc: 'A trusted tool or partner the community should know about' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

interface Sections {
  [key: string]: string
}

interface NewsletterFormProps {
  id?: string
  initialSubject?: string
  initialPreview?: string
  initialSections?: Sections
  memberCount: number
}

export default function NewsletterForm({
  id,
  initialSubject = '',
  initialPreview = '',
  initialSections = {},
  memberCount,
}: NewsletterFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(initialSubject)
  const [previewText, setPreviewText] = useState(initialPreview)
  const [sections, setSections] = useState<Sections>(initialSections)
  const [openSection, setOpenSection] = useState<SectionKey | null>('talk_news')
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

  const updateSection = (key: string, html: string) => {
    setSections(prev => ({ ...prev, [key]: html }))
  }

  const hasContent = (html: string) => html && html !== '<p></p>' && html.trim() !== ''

  const filledSections = SECTIONS.filter(s => hasContent(sections[s.key] ?? ''))

  async function save() {
    setLoading('save')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, previewText, sections, action: 'save' }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to save'); return }
    showToast('success', 'Draft saved!')
    if (!id && data.id) router.replace(`/admin/newsletter/${data.id}`)
  }

  async function send() {
    if (!subject.trim()) { showToast('error', 'Subject is required'); return }
    if (filledSections.length === 0) { showToast('error', 'Write at least one section'); return }
    if (!confirm(`Send this newsletter to ${memberCount} members now?`)) return
    setLoading('send')
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, previewText, sections, action: 'send' }),
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
      body: JSON.stringify({ id, subject, previewText, sections, action: 'schedule', scheduledFor }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to schedule'); return }
    showToast('success', `Scheduled for ${scheduledFor.toLocaleDateString()}!`)
    setTimeout(() => router.push('/admin/newsletter'), 1500)
  }

  const nextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Subject + preview */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Subject line</Label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={`This week in TALK — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
            className="text-base font-semibold"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Preview text <span className="text-zinc-400 normal-case font-normal">(shows in inbox under subject)</span>
          </Label>
          <Input
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            placeholder="Here's what's happening in the TALK community this week…"
          />
        </div>
      </div>

      {/* Section editors */}
      <div className="space-y-3">
        {SECTIONS.map(({ key, label, icon: Icon, color, desc }) => {
          const isOpen = openSection === key
          const content = sections[key] ?? ''
          const filled = hasContent(content)
          return (
            <div key={key} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : key)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
              >
                <div className="size-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">{label}</span>
                    {filled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                        Written ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{desc}</p>
                </div>
                {isOpen ? <ChevronUp className="size-4 text-zinc-400 shrink-0" /> : <ChevronDown className="size-4 text-zinc-400 shrink-0" />}
              </button>

              {/* Editor */}
              {isOpen && (
                <div className="border-t border-zinc-100">
                  <NewsletterEditor
                    key={key}
                    content={content}
                    onChange={html => updateSection(key, html)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview */}
      {filledSections.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors"
          >
            <span className="text-sm font-bold text-zinc-700 flex items-center gap-2">
              {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {showPreview ? 'Hide preview' : 'Preview email'}
            </span>
            <span className="text-xs text-zinc-400">{filledSections.length} of {SECTIONS.length} sections written</span>
          </button>

          {showPreview && (
            <div className="border-t border-zinc-100 p-6 bg-[#f4f4f5]">
              <div className="max-w-[580px] mx-auto rounded-2xl overflow-hidden shadow-sm">
                {/* Email header */}
                <div style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, #1a1a2e 100%)' }} className="px-8 py-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-black text-white text-xl">TALK</span>
                  </div>
                  <p className="text-white/60 text-sm">{subject || 'Your newsletter subject'}</p>
                </div>
                {/* Sections */}
                <div className="bg-white px-8 py-6 space-y-6">
                  <p className="text-zinc-600 text-sm">Hi there,</p>
                  {filledSections.map(s => (
                    <div key={s.key}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-0.5 w-5 rounded" style={{ background: s.color }} />
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: s.color }}>{s.label}</span>
                        <div className="h-0.5 flex-1 rounded bg-zinc-100" />
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-zinc-700"
                        dangerouslySetInnerHTML={{ __html: sections[s.key] }}
                      />
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="bg-zinc-50 px-8 py-5 text-center border-t border-zinc-100">
                  <p className="text-xs text-zinc-400">You&apos;re receiving this as a TALK community member.</p>
                  <p className="text-xs text-zinc-400 mt-1">© {new Date().getFullYear()} TALK Community</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-all"
          >
            {loading === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save draft
          </button>

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
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)', color: '#0d0d0d' }}
          >
            {loading === 'send' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send now · {memberCount} members
          </button>

          <span className="text-xs text-zinc-400 ml-auto">
            {filledSections.length}/{SECTIONS.length} sections complete
          </span>
        </div>

        {showScheduler && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">Date</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-40" />
                <button type="button" onClick={() => setScheduleDate(nextMonday())}
                  className="text-xs font-semibold text-[#00b894] hover:underline whitespace-nowrap flex items-center gap-1">
                  <Calendar className="size-3" /> Next Monday
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-60 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#0d0d0d' }}
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
