'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Check, AlertTriangle } from 'lucide-react'
import { sendTestChapterEmail, sendChapterEmail, getChapterAudienceCount } from './chapter-email-actions'

const RichTextEditor = dynamic(() => import('@/components/newsletter-editor'), { ssr: false })

const isMeaningfulHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim().length > 0

export default function ChapterEmailComposer({ chapterId, chapterName }: { chapterId: string; chapterName: string }) {
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [audienceCount, setAudienceCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getChapterAudienceCount(chapterId).then(({ total }) => {
      if (!cancelled) setAudienceCount(total)
    })
    return () => { cancelled = true }
  }, [chapterId])

  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testTo, setTestTo] = useState<string | null>(null)
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null)

  const ready = subject.trim().length > 0 && isMeaningfulHtml(bodyHtml)
  const canSend = ready && confirmText.trim().toUpperCase() === 'SEND' && sendState !== 'sending' && audienceCount !== null

  async function onTest() {
    setTestState('sending')
    const { ok, to } = await sendTestChapterEmail(chapterId, subject, bodyHtml)
    setTestState(ok ? 'sent' : 'error')
    setTestTo(to ?? null)
  }

  async function onSend() {
    if (!canSend) return
    setSendState('sending')
    try {
      const res = await sendChapterEmail(chapterId, subject, bodyHtml)
      if (res.ok) {
        setResult({ sent: res.sent, skipped: res.skipped, total: res.total })
        setSendState('done')
        setConfirmText('')
      } else {
        setSendState('error')
      }
    } catch {
      setSendState('error')
    }
  }

  if (sendState === 'done' && result) {
    return (
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <Check className="size-5" /> Email sent
        </div>
        <p className="text-sm text-foreground">
          Delivered to <strong>{result.sent.toLocaleString()}</strong> of {result.total.toLocaleString()}{' '}
          {chapterName} members{result.skipped > 0 && <> · {result.skipped.toLocaleString()} skipped (unsubscribed)</>}.
        </p>
        <Button
          variant="outline"
          onClick={() => { setSendState('idle'); setResult(null); setSubject(''); setBodyHtml('') }}
        >
          Compose another
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-6 space-y-5">
      <p className="text-sm text-muted-foreground">
        Sends to every approved {chapterName} member (minus anyone unsubscribed) — this can&apos;t reach
        other chapters. Every message includes a working unsubscribe link.
      </p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Subject</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={`e.g. ${chapterName} — this month's meetup`} maxLength={150} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Message</label>
        <RichTextEditor content={bodyHtml} onChange={setBodyHtml} uploadFolder="chapter-email" />
        <p className="text-xs text-muted-foreground">Your TALK header, footer, and unsubscribe link are added automatically.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" variant="outline" onClick={onTest} disabled={!ready || testState === 'sending'}>
          {testState === 'sending' ? (<><Loader2 className="size-4 animate-spin" /> Sending test…</>) : (<><Send className="size-4" /> Send test to me</>)}
        </Button>
        {testState === 'sent' && <span className="text-sm text-emerald-700">Test sent{testTo ? ` to ${testTo}` : ''} ✓</span>}
        {testState === 'error' && <span className="text-sm text-red-600">Test failed — check the fields.</span>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900 leading-relaxed">
            {audienceCount === null ? 'Counting recipients…' : (
              <>This sends to <strong>{audienceCount.toLocaleString()}</strong> {chapterName} members. Preview with a test first.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type SEND to confirm" className="max-w-[200px]" disabled={!ready} />
          <Button type="button" onClick={onSend} disabled={!canSend}>
            {sendState === 'sending' ? (<><Loader2 className="size-4 animate-spin" /> Sending…</>) : audienceCount === null ? (<><Loader2 className="size-4 animate-spin" /> Counting…</>) : (<>Send to {audienceCount.toLocaleString()} members</>)}
          </Button>
        </div>
        {sendState === 'error' && <p className="text-sm text-red-600">Something went wrong. Some batches may not have sent.</p>}
      </div>
    </div>
  )
}
