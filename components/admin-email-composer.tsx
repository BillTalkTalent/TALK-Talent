'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Loader2, Check, Mail, AlertTriangle, Lock, Users, Clock, X } from 'lucide-react'
import {
  sendTestEmail,
  sendToAllMembers,
  scheduleMemberEmail,
  getAudienceCount,
  getScheduledEmails,
  cancelScheduledEmail,
  type ChapterOption,
  type ScheduledEmail,
} from '@/app/admin/email/email-actions'
import type { AudienceRole } from '@/lib/email-audience'

const RichTextEditor = dynamic(() => import('@/components/newsletter-editor'), { ssr: false })

const ALL_MEMBERS = 'all'
const EVERYONE = 'all'

const isMeaningfulHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim().length > 0

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
  const [bodyHtml, setBodyHtml] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [audience, setAudience] = useState(ALL_MEMBERS)
  const [role, setRole] = useState<typeof EVERYONE | AudienceRole>(EVERYONE)
  const [when, setWhen] = useState<'now' | 'schedule'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')

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

  // Sending (or scheduling) to literally everyone (no chapter, no role
  // filter) is reserved for the super admin — any admin can send once it's
  // narrowed to a chapter and/or board members only.
  const isEveryoneAudience = !selectedChapter && !selectedRole
  const audienceLocked = !isSuperAdmin && isEveryoneAudience

  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testTo, setTestTo] = useState<string | null>(null)

  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null)
  const [scheduleState, setScheduleState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const [scheduled, setScheduled] = useState<ScheduledEmail[] | null>(null)

  async function refreshScheduled() {
    setScheduled(await getScheduledEmails())
  }

  useEffect(() => {
    let cancelled = false
    getScheduledEmails().then((rows) => {
      if (!cancelled) setScheduled(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // "Now" for the future-time check below has to come from an effect, not
  // render — Date.now() is an impure call and React's rules disallow impure
  // calls in the render body. Refreshed periodically so the check stays
  // accurate the longer the form stays open.
  const [nowMs, setNowMs] = useState<number | null>(null)
  useEffect(() => {
    Promise.resolve().then(() => setNowMs(Date.now()))
    const id = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const ready = subject.trim().length > 0 && isMeaningfulHtml(bodyHtml)
  const countLoading = needsLiveCount && comboCount === null
  const scheduledForIso = when === 'schedule' && scheduleDate ? new Date(`${scheduleDate}T${scheduleTime || '00:00'}:00`).toISOString() : null
  const scheduleReady = when === 'now' || (!!scheduleDate && !!scheduledForIso && nowMs !== null && new Date(scheduledForIso).getTime() > nowMs)

  const canSend = ready && confirmText.trim().toUpperCase() === 'SEND' && sendState !== 'sending' && !countLoading && !audienceLocked && scheduleReady

  async function onTest() {
    setTestState('sending')
    const { ok, to } = await sendTestEmail(subject, bodyHtml)
    setTestState(ok ? 'sent' : 'error')
    setTestTo(to ?? null)
  }

  async function onSend() {
    if (!canSend) return

    if (when === 'schedule' && scheduledForIso) {
      setScheduleState('saving')
      setScheduleError(null)
      const res = await scheduleMemberEmail(subject, bodyHtml, scheduledForIso, selectedChapter?.id ?? null, selectedRole)
      if (res.ok) {
        setScheduleState('done')
        setConfirmText('')
        setSubject('')
        setBodyHtml('')
        setScheduleDate('')
        await refreshScheduled()
      } else {
        setScheduleState('error')
        setScheduleError(res.error ?? 'Failed to schedule.')
      }
      return
    }

    setSendState('sending')
    try {
      const res = await sendToAllMembers(subject, bodyHtml, selectedChapter?.id ?? null, selectedRole)
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

  async function onCancelScheduled(id: string) {
    await cancelScheduledEmail(id)
    await refreshScheduled()
  }

  function describeScheduled(s: ScheduledEmail): string {
    const roleLabel = s.audience_role === 'board_member' ? 'board members' : 'members'
    const chapter = s.chapter_id ? chapters.find((c) => c.id === s.chapter_id) : null
    return `${roleLabel}${chapter ? ` · ${chapter.name} chapter` : ''}`
  }

  const scheduledList = (scheduled ?? []).length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-zinc-500" /> Scheduled
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(scheduled ?? []).map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{s.subject}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {new Date(s.scheduled_for).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                {' · '}{describeScheduled(s)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCancelScheduled(s.id)}
              className="shrink-0 p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cancel scheduled send"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )

  if (sendState === 'done' && result) {
    return (
      <div className="space-y-6">
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
                setBodyHtml('')
              }}
            >
              Compose another
            </Button>
          </CardContent>
        </Card>
        {scheduledList}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5 text-zinc-500" /> Email Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-zinc-500 -mt-1">
            Send a branded email to all approved members, target a single chapter, and/or reach board
            members only — right away or scheduled for later. Every message includes a working
            unsubscribe link, and anyone who&apos;s unsubscribed is skipped automatically.
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
            <RichTextEditor content={bodyHtml} onChange={setBodyHtml} uploadFolder="member-email" />
            <p className="text-xs text-zinc-400">
              Your TALK header, footer, and unsubscribe link are added automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
              <Clock className="size-3.5" /> When
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} />
                Send now
              </label>
              <label className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input type="radio" checked={when === 'schedule'} onChange={() => setWhen('schedule')} />
                Schedule for later
              </label>
              {when === 'schedule' && (
                <>
                  <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-40" />
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-32" />
                </>
              )}
            </div>
            {when === 'schedule' && scheduleDate && !scheduleReady && (
              <p className="text-xs text-red-600">Pick a time in the future.</p>
            )}
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
                ) : when === 'schedule' ? (
                  <>This will send to <strong>{(targetCount ?? 0).toLocaleString()}</strong> {audienceLabel} at the scheduled time.</>
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
                {sendState === 'sending' || scheduleState === 'saving' ? (
                  <><Loader2 className="size-4 animate-spin" /> {when === 'schedule' ? 'Scheduling…' : 'Sending…'}</>
                ) : countLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Counting…</>
                ) : when === 'schedule' ? (
                  <><Clock className="size-4" /> Schedule for {(targetCount ?? 0).toLocaleString()} {audienceLabel}</>
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
            {scheduleState === 'done' && (
              <p className="text-sm text-emerald-700">Scheduled ✓ — see it below, cancel anytime before it sends.</p>
            )}
            {scheduleState === 'error' && scheduleError && (
              <p className="text-sm text-red-600">{scheduleError}</p>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {scheduledList}
    </div>
  )
}
