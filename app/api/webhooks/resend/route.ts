import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Resend webhook: records bounces/complaints (auto-suppressing dead addresses
// so we never email them again) and, for newsletter sends specifically,
// opens/clicks (see migration 082). Verified with the Svix signature scheme
// Resend uses, so only genuine Resend calls are accepted.

function verifySignature(secret: string, headers: Headers, body: string): boolean {
  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatureHeader = headers.get('svix-signature')
  if (!id || !timestamp || !signatureHeader) return false

  // Secret is "whsec_<base64>"; sign "<id>.<timestamp>.<body>" with HMAC-SHA256.
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')

  // Header holds space-separated "v1,<sig>" entries; accept if any matches.
  return signatureHeader.split(' ').some((part) => {
    const sig = part.split(',')[1]
    if (!sig || sig.length !== expected.length) return false
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })

  const body = await req.text()
  if (!verifySignature(secret, req.headers, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  const type = event.type ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  if (type === 'email.opened' || type === 'email.clicked') {
    const data = event.data ?? {}
    const emailId = data.email_id ? String(data.email_id) : null
    if (!emailId) return NextResponse.json({ ok: true, ignored: 'no email_id' })

    // Only newsletter sends get a newsletter_recipients row (see
    // lib/newsletter-send.ts) — an open/click on any other Resend email
    // (approval notices, invites, etc.) has nothing to look up and is
    // silently ignored, which is correct: this table is newsletter-only.
    const { data: recipient } = await admin
      .from('newsletter_recipients')
      .select('newsletter_id, email')
      .eq('resend_email_id', emailId)
      .maybeSingle()
    if (!recipient) return NextResponse.json({ ok: true, ignored: 'not a newsletter send' })

    const click = (data.click ?? {}) as { link?: string }
    await admin.from('newsletter_events').insert({
      newsletter_id: recipient.newsletter_id,
      email: recipient.email,
      event_type: type === 'email.opened' ? 'opened' : 'clicked',
      link_url: type === 'email.clicked' ? (click.link ?? null) : null,
      resend_email_id: emailId,
    })
    return NextResponse.json({ ok: true })
  }

  if (type !== 'email.bounced' && type !== 'email.complained') {
    return NextResponse.json({ ok: true, ignored: type })
  }

  const data = event.data ?? {}
  const to = Array.isArray(data.to) ? (data.to as string[]) : data.to ? [String(data.to)] : []
  const bounce = (data.bounce ?? {}) as { type?: string; subType?: string; message?: string }
  // Complaints and permanent (hard) bounces are dead addresses → suppress.
  // Transient (soft) bounces are temporary (full mailbox, greylisting) → record only.
  const isComplaint = type === 'email.complained'
  const suppress = isComplaint || bounce.type !== 'Transient'

  for (const raw of to) {
    const email = String(raw).toLowerCase().trim()
    if (!email) continue
    await admin.from('email_bounces').insert({
      email,
      event_type: isComplaint ? 'complained' : 'bounced',
      bounce_type: bounce.type ?? (isComplaint ? null : 'Permanent'),
      bounce_subtype: bounce.subType ?? null,
      reason: bounce.message ?? null,
      suppressed: suppress,
      raw: event as unknown as Record<string, unknown>,
    })
    if (suppress) {
      await admin
        .from('email_unsubscribes')
        .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    }
  }

  return NextResponse.json({ ok: true, suppressed: suppress, recipients: to.length })
}
