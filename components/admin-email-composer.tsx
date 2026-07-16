'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Check, Mail, AlertTriangle } from 'lucide-react'
import { sendTestEmail, sendToAllMembers } from '@/app/admin/email/email-actions'

export default function AdminEmailComposer({ audienceCount }: { audienceCount: number }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testTo, setTestTo] = useState<string | null>(null)

  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null)

  const ready = subject.trim().length > 0 && body.trim().length > 0
  const canSend = ready && confirmText.trim().toUpperCase() === 'SEND' && sendState !== 'sending'

  async function onTest() {
    setTestState('sending')
    const { ok, to } = await sendTestEmail(subject, body)
    setTestState(ok ? 'sent' : 'error')
    setTestTo(to ?? null)
  }

  async function onSend() {
    if (!canSend) return
    setSendState('sending')
    try {
      const res = await sendToAllMembers(subject, body)
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="size-5 text-emerald-600" /> Email sent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-700">
            Delivered to <strong>{result.sent.toLocaleString()}</strong> of{' '}
            {result.total.toLocaleString()} members
            {result.skipped > 0 && <> · {result.skipped.toLocaleString()} skipped (unsubscribed)</>}.
          </p>
          <p className="text-xs text-zinc-500">
            Check bounce and complaint rates in Resend before sending the next one.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSendState('idle')
              setResult(null)
              setSubject('')
              setBody('')
            }}
          >
            Compose another
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-zinc-500" /> Email Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-zinc-500 -mt-1">
          Send a branded email to all approved members. Every message includes a working unsubscribe
          link, and anyone who&apos;s unsubscribed is skipped automatically.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New this month in TALK Talent"
            maxLength={150}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder={
              'Hi there,\n\nWrite your update here. Leave a blank line between paragraphs.\n\n— Bill'
            }
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-800 leading-relaxed resize-y focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300"
          />
          <p className="text-xs text-zinc-400">
            Plain text. Blank lines become paragraphs. Your TALK header and footer are added
            automatically.
          </p>
        </div>

        {/* Test send */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" variant="outline" onClick={onTest} disabled={!ready || testState === 'sending'}>
            {testState === 'sending' ? (
              <><Loader2 className="size-4 animate-spin" /> Sending test…</>
            ) : (
              <><Send className="size-4" /> Send test to me</>
            )}
          </Button>
          {testState === 'sent' && (
            <span className="text-sm text-emerald-700">Test sent{testTo ? ` to ${testTo}` : ''} ✓</span>
          )}
          {testState === 'error' && <span className="text-sm text-red-600">Test failed — check the fields.</span>}
        </div>

        {/* Danger zone: send to everyone */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 leading-relaxed">
              This sends to <strong>{audienceCount.toLocaleString()}</strong> members. For a list this
              size, sending in waves protects your domain reputation — blasting everyone at once can
              spike bounces. Preview with a test first.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type SEND to confirm"
              className="max-w-[200px]"
              disabled={!ready}
            />
            <Button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="bg-[#E8503A] hover:bg-[#d4472f]"
            >
              {sendState === 'sending' ? (
                <><Loader2 className="size-4 animate-spin" /> Sending…</>
              ) : (
                <>Send to {audienceCount.toLocaleString()} members</>
              )}
            </Button>
          </div>
          {sendState === 'sending' && (
            <p className="text-xs text-amber-800">
              Sending in batches — this can take a few minutes for a large list. Keep this tab open.
            </p>
          )}
          {sendState === 'error' && (
            <p className="text-sm text-red-600">Something went wrong. Some batches may not have sent — check Resend.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
