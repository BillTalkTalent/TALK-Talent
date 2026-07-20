'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Send, Save, Clock, Eye, EyeOff, Loader2,
  Calendar, ChevronDown, ChevronUp, Newspaper,
  Star, Globe, Briefcase, Megaphone
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const NewsletterEditor = dynamic(() => import('@/components/newsletter-editor'), { ssr: false })

const SECTIONS = [
  { key: 'talk_news',          label: 'TALK News',            icon: Newspaper,  color: '#E8503A', desc: 'Community updates, announcements, upcoming events' },
  { key: 'member_highlight',   label: 'Member Highlight',     icon: Star,       color: '#f59e0b', desc: 'Spotlight a member — their story, role, or advice' },
  { key: 'industry_news',      label: 'Industry News',        icon: Globe,      color: '#3b82f6', desc: "TA trends, research, and what's happening out there" },
  { key: 'career_opportunities', label: 'Career Opportunities', icon: Briefcase, color: '#8b5cf6', desc: 'Curated jobs and opportunities worth sharing' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

interface Sections {
  [key: string]: string
}

const DEFAULT_INTRO = "Here's your weekly roundup from the TALK community."

interface NewsletterFormProps {
  id?: string
  initialSubject?: string
  initialPreview?: string
  initialIntro?: string
  initialSections?: Sections
  memberCount: number
}

export default function NewsletterForm({
  id,
  initialSubject = '',
  initialPreview = '',
  initialIntro = '',
  initialSections = {},
  memberCount,
}: NewsletterFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(initialSubject)
  const [previewText, setPreviewText] = useState(initialPreview)
  const [intro, setIntro] = useState(initialIntro)
  const [sections, setSections] = useState<Sections>(initialSections)
  const [openSection, setOpenSection] = useState<SectionKey | null>('talk_news')
  const [showPreview, setShowPreview] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [showScheduler, setShowScheduler] = useState(false)
  const [loading, setLoading] = useState<'save' | 'send' | 'schedule' | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  type ActiveSponsor = {
    name: string; logo_url: string | null; url: string | null; blurb: string | null
    offer: string | null; offer_url: string | null; offer_cta: string | null; expires_at: string
  }
  const [activeSponsor, setActiveSponsor] = useState<ActiveSponsor | null>(null)
  const [skipSponsor, setSkipSponsor] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nl_test_email') : null
    if (saved) { setTestEmail(saved); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(createClient() as any).auth.getUser().then(({ data }: { data: { user: { email?: string } | null } }) => {
      if (data?.user?.email) setTestEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(createClient() as any)
      .from('newsletter_sponsors')
      .select('name, logo_url, url, blurb, offer, offer_url, offer_cta, expires_at')
      .gte('expires_at', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }: { data: ActiveSponsor[] | null }) => setActiveSponsor(data?.[0] ?? null))
  }, [])

  const showSponsor = activeSponsor && !skipSponsor

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
      body: JSON.stringify({ id, subject, previewText, intro, sections, skipSponsor, action: 'save' }),
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
      body: JSON.stringify({ id, subject, previewText, intro, sections, skipSponsor, action: 'send' }),
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
      body: JSON.stringify({ id, subject, previewText, intro, sections, skipSponsor, action: 'schedule', scheduledFor }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to schedule'); return }
    showToast('success', `Scheduled for ${scheduledFor.toLocaleDateString()}!`)
    setTimeout(() => router.push('/admin/newsletter'), 1500)
  }

  async function sendTest() {
    const to = testEmail.trim()
    if (!to) { showToast('error', 'Enter a test email'); return }
    if (filledSections.length === 0) { showToast('error', 'Write at least one section first'); return }
    localStorage.setItem('nl_test_email', to)
    setSendingTest(true)
    const res = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, previewText, intro, sections, skipSponsor, testEmail: to, action: 'test' }),
    })
    const data = await res.json()
    setSendingTest(false)
    if (!res.ok) { showToast('error', data.error ?? 'Failed to send test'); return }
    showToast('success', `Test sent to ${data.to}`)
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
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Opening message <span className="text-zinc-400 normal-case font-normal">(shown right after &ldquo;Hi [name],&rdquo; — leave blank for the default)</span>
          </Label>
          <Input
            value={intro}
            onChange={e => setIntro(e.target.value)}
            placeholder={DEFAULT_INTRO}
          />
        </div>
      </div>

      {/* Sponsor banner */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Megaphone className="size-4 text-zinc-400 shrink-0" />
          {activeSponsor ? (
            <p className="text-sm text-zinc-700 truncate">
              Sponsored by <strong className="text-zinc-900">{activeSponsor.name}</strong>
              <span className="text-zinc-400"> · top masthead{activeSponsor.offer ? ' + bottom offer' : ''} · runs until {activeSponsor.expires_at}</span>
            </p>
          ) : (
            <p className="text-sm text-zinc-400">No active sponsor.</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activeSponsor && (
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
              <input type="checkbox" checked={skipSponsor} onChange={e => setSkipSponsor(e.target.checked)} className="size-3.5" />
              Skip for this edition
            </label>
          )}
          <a href="/admin/newsletter/sponsors" className="text-xs font-semibold text-[#E8503A] hover:underline whitespace-nowrap">Manage sponsors →</a>
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
                {/* Sponsor masthead */}
                {showSponsor && (
                  <div className="bg-white px-8 pt-5 pb-1">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-6 py-5 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 mb-3">Presented by</p>
                      {activeSponsor!.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={activeSponsor!.logo_url} alt={activeSponsor!.name} className="mx-auto max-h-11 w-auto mb-2 object-contain" />
                        : null}
                      <p className={`font-extrabold text-zinc-900 ${activeSponsor!.logo_url ? 'text-sm' : 'text-lg'}`}>{activeSponsor!.name}</p>
                      {activeSponsor!.blurb && <p className="text-[13px] text-zinc-500 mt-1.5">{activeSponsor!.blurb}</p>}
                      {activeSponsor!.offer
                        ? <p className="text-xs font-bold text-[#E8503A] mt-3">🎁 Special offer for TALK members below ↓</p>
                        : activeSponsor!.url
                        ? <p className="mt-3"><span className="text-xs font-bold text-[#0F1F35] border-b-2 border-[#E8503A] pb-px">Learn more →</span></p>
                        : null}
                    </div>
                  </div>
                )}
                {/* Sections */}
                <div className="bg-white px-8 py-6 space-y-6">
                  <div>
                    <p className="text-zinc-600 text-sm">Hi <span className="text-zinc-400">[first name],</span></p>
                    <p className="text-zinc-500 text-sm mt-1">{intro.trim() || DEFAULT_INTRO}</p>
                    <hr className="border-zinc-100 mt-4" />
                  </div>
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
                {/* Sponsor special-offer callout */}
                {showSponsor && activeSponsor!.offer && (
                  <div className="bg-white px-8 pb-6">
                    <div className="rounded-2xl bg-[#0F1F35] px-6 py-6 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F07058] mb-2.5">Special offer · {activeSponsor!.name}</p>
                      <p className="text-white font-bold text-base leading-snug">{activeSponsor!.offer}</p>
                      <div className="mt-4">
                        <span className="inline-block bg-[#E8503A] text-white text-sm font-bold px-6 py-2.5 rounded-lg">
                          {activeSponsor!.offer_cta?.trim() || 'Claim offer'} →
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
            style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)', color: '#0d0d0d' }}
          >
            {loading === 'send' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send now · {memberCount} members
          </button>

          <span className="text-xs text-zinc-400 ml-auto">
            {filledSections.length}/{SECTIONS.length} sections complete
          </span>
        </div>

        {/* Send a test copy */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Send a test to</span>
          <Input
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="max-w-[240px] h-9"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={sendingTest || !!loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-all"
          >
            {sendingTest ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send test
          </button>
        </div>

        {showScheduler && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500">Date</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-40" />
                <button type="button" onClick={() => setScheduleDate(nextMonday())}
                  className="text-xs font-semibold text-[#E8503A] hover:underline whitespace-nowrap flex items-center gap-1">
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
