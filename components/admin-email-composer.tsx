'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, Check, Mail, AlertTriangle, Lock, Users } from 'lucide-react'
import { sendTestEmail, sendToAllMembers, getAudienceCount, type ChapterOption, type AudienceRole } from '@/app/admin/email/email-actions'

const ALL_MEMBERS = 'all'
const EVERYONE = 'all'

export default function AdminEmailComposer({
  audienceCount,
  chapters,
  boardMemberCount,
  isSuperAdmin,
}: {
  audienceCount: number
  chapters: ChapterOption[]
  boardMemberCount: number
  isSuperAdmin: boolean
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [audience, setAudience] = useState(ALL_MEMBERS)
  const [role, setRole] = useState<typeof EVERYONE | AudienceRole>(EVERYONE)

  const selectedChapter = audience === ALL_MEMBERS ? null : chapters.find((c) => c.id === audience) ?? null
  const selectedRole = role === EVERYONE ? null : role

  // Chapter counts and the overall board-member count are precomputed props
  // (no filter, or one filter at a time) — but "board members in a specific
  // chapter" is a combination nothing precomputed, so fetch that live.
  const needsLiveCount = selectedRole !== null && selectedChapter !== null
  const comboKey = needsLiveCount ? `${selectedChapter!.id}:${selectedRole}` : null
  const [combo, setCombo] = useState<{ key: string; count: number } | null>(null)

  useEffect(() => {
    if (!comboKey) return
    let cancelled = false
    getAudienceCount(selectedChapter!.id, selectedRole).then(({ total }) => {
      if (!cancelled) setCombo({ key: comboKey, count: total })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboKey])

  const comboCount = needsLiveCount && combo?.key === comboKey ? combo.count : null

  const targetCount = needsLiveCount
    ? comboCount
    : selectedRole
      ? boardMemberCount
      : selectedChapter
        ? selectedChapter.memberCount
        : audienceCount

  const audienceLabel = `${selectedRole ? 'board members' : 'members'}${selectedChapter ? ` of the ${selectedChapter.name} chapter` : ''}`

  // Sending to literally everyone (no chapter, no role filter) is reserved
  // for the super admin — any admin can send once it's narrowed to a
  // chapter and/or board members only.
  const isEveryoneAudience = !selectedChapter && !selectedRole
  const audienceLocked = !isSuperAdmin && isEveryoneAudience

  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testTo, setTestTo] = useState<string | null>(null)

  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null)

  const ready = subject.trim().length > 0 && body.trim().length > 0
  const countLoading = needsLiveCount && comboCount === null
  const canSend = ready && confirmText.trim().toUpperCase() === 'SEND' && sendState !== 'sending' && !countLoading && !audienceLocked

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
      const res = await sendToAllMembers(subject, body, selectedChapter?.id ?? null, selectedRole)
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
          Send a branded email to all approved members, target a single chapter, and/or reach board
          members only. Every message includes a working unsubscribe link, and anyone who&apos;s
          unsubscribed is skipped automatically.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
              <Users className="size-3.5" /> Chapter
            </label>
            <Select value={audience} onValueChange={(value) => setAudience(value ?? ALL_MEMBERS)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MEMBERS}>All chapters ({audienceCount.toLocaleString()})</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} chapter ({c.memberCount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chapters.length === 0 && (
              <p className="text-xs text-zinc-400">No chapters set up yet — add one in Admin → Chapters to target it here.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Member type</label>
            <Select value={role} onValueChange={(value) => setRole((value as typeof role) ?? EVERYONE)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERYONE}>All members</SelectItem>
                <SelectItem value="board_member">Board members only ({boardMemberCount.toLocaleString()})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

        {/* Danger zone: blasting literally everyone is super-admin only —
            a chapter and/or board-member scoped send is open to any admin */}
        {audienceLocked ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-start gap-2">
            <Lock className="size-4 text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-sm text-zinc-500 leading-relaxed">
              Only the super admin can send to the full membership ({audienceCount.toLocaleString()}{' '}
              people). Pick a chapter and/or &quot;Board members only&quot; above to send it yourself,
              or use the test send above to preview what you&apos;ve written.
            </p>
          </div>
        ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 leading-relaxed">
              {countLoading ? (
                'Counting recipients…'
              ) : (
                <>This sends to <strong>{(targetCount ?? 0).toLocaleString()}</strong> {audienceLabel}.</>
              )}
              {' '}For a list this size, sending in waves protects your domain reputation — blasting
              everyone at once can spike bounces. Preview with a test first.
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
              ) : countLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Counting…</>
              ) : (
                <>Send to {(targetCount ?? 0).toLocaleString()} {audienceLabel}</>
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
        )}
      </CardContent>
    </Card>
  )
}
