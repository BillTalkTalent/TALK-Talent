import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import {
  buildClaimEmail, buildResetEmail, buildTestInviteEmail, buildCheckinEmail,
  buildClaimText, buildResetText, buildTestInviteText, buildCheckinText,
} from '@/lib/email'

type Mode = 'claim' | 'reset' | 'relaunch' | 'checkin'

export async function POST(req: NextRequest) {
  try {
    const { email, mode = 'claim' } = (await req.json()) as { email?: string; mode?: Mode }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const email0 = email.toLowerCase().trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Rate limit: cap claim/reset emails to 2 per address per 5 minutes (anti-bombing).
    // Keyed per-email so it never throttles the bulk migration wave (each member once).
    // Fails OPEN if the tracking table isn't present yet, so it can't break sends.
    try {
      const since = new Date(Date.now() - 5 * 60_000).toISOString()
      const { count } = await admin.from('recovery_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('email', email0).gte('created_at', since)
      if ((count ?? 0) >= 2) {
        return NextResponse.json(
          { error: 'Too many requests for this email. Please try again in a few minutes.' },
          { status: 429 }
        )
      }
      const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
      await admin.from('recovery_attempts').insert({ ip, email: email0 })
    } catch {
      /* table missing or transient error — fail open and allow the send */
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    const redirectTo =
      mode === 'reset'
        ? `${origin}/auth/reset-password`
        : `${origin}/auth/reset-password?claim=1`

    // Generate a recovery link WITHOUT Supabase sending it — we send via Resend.
    // Resolve the account by the entered email first; if that isn't a login email,
    // fall back to the member_email_aliases index (their professional/personal
    // address on file) so members who forget which email they used still get in.
    // The link is always sent to the address they entered.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function resolveLink(addr: string): Promise<any | null> {
      const r = await admin.auth.admin.generateLink({ type: 'recovery', email: addr, options: { redirectTo } })
      return (!r.error && r.data?.properties?.action_link) ? r.data : null
    }
    let data = await resolveLink(email0)
    if (!data) {
      try {
        const { data: alias } = await admin
          .from('member_email_aliases').select('primary_email').eq('alias_email', email0).maybeSingle()
        if (alias?.primary_email) data = await resolveLink(alias.primary_email)
      } catch { /* alias table not present yet — ignore and fall through */ }
    }
    // No account for any known address — return success anyway (never leak membership).
    if (!data) {
      return NextResponse.json({ ok: true })
    }

    // Point the email at OUR page carrying the one-time token_hash, rather than
    // Supabase's /verify action_link. Our page verifies it client-side via
    // verifyOtp, which works without a PKCE code_verifier (any device) and isn't
    // burned by email-security scanners that fetch links without running JS.
    const tokenHash: string = data.properties.hashed_token
    const link = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}token_hash=${tokenHash}&type=recovery`
    const fullName: string | null =
      data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null
    const firstName = fullName?.split(' ')[0] ?? 'there'

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

    const { subject, html, text } =
      mode === 'checkin'
        ? {
            subject: 'Quick midweek check-in — and your login’s sorted',
            html: buildCheckinEmail({ toFirstName: firstName, claimUrl: link }),
            text: buildCheckinText({ toFirstName: firstName, claimUrl: link }),
          }
        : mode === 'relaunch'
        ? {
            subject: 'TALK is fixed — your fresh link + what to test',
            html: buildTestInviteEmail({ toFirstName: firstName, claimUrl: link }),
            text: buildTestInviteText({ toFirstName: firstName, claimUrl: link }),
          }
        : mode === 'reset'
        ? {
            subject: 'Reset your TALK password',
            html: buildResetEmail({ toFirstName: firstName, resetUrl: link }),
            text: buildResetText({ toFirstName: firstName, resetUrl: link }),
          }
        : {
            subject: 'Welcome to the new TALK — claim your account',
            html: buildClaimEmail({ toFirstName: firstName, claimUrl: link }),
            text: buildClaimText({ toFirstName: firstName, claimUrl: link }),
          }

    await resend.emails.send({ from, replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com', to: email0, subject, html, text })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/recovery]', err)
    // Still return ok to avoid leaking membership / breaking the UX
    return NextResponse.json({ ok: true })
  }
}
