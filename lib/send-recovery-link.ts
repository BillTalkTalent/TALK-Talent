import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildClaimEmail, buildResetEmail, buildTestInviteEmail, buildCheckinEmail, buildFoundExistingAccountEmail,
  buildClaimText, buildResetText, buildTestInviteText, buildCheckinText, buildFoundExistingAccountText,
} from '@/lib/email'

export type RecoveryMode = 'claim' | 'reset' | 'relaunch' | 'checkin' | 'duplicate'

// Shared by app/api/auth/recovery (the "forgot password" / claim-account
// flow) and the duplicate-account confirmation in app/auth/duplicate-check
// — both just need "generate a recovery link for this email and send it,
// branded for the situation," with the same rate limiting either way.
export async function sendRecoveryLink(email: string, mode: RecoveryMode, origin: string): Promise<{ ok: boolean; error?: string }> {
  const email0 = email.toLowerCase().trim()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Cap to 2 per address per 5 minutes (anti-bombing) — fails open if the
  // tracking table isn't present, so it can't break real sends.
  try {
    const since = new Date(Date.now() - 5 * 60_000).toISOString()
    const { count } = await admin.from('recovery_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email0).gte('created_at', since)
    if ((count ?? 0) >= 2) {
      return { ok: false, error: 'Too many requests for this email. Please try again in a few minutes.' }
    }
    await admin.from('recovery_attempts').insert({ ip: null, email: email0 })
  } catch {
    /* table missing or transient error — fail open and allow the send */
  }

  const redirectTo = mode === 'reset' ? `${origin}/auth/reset-password` : `${origin}/auth/reset-password?claim=1`

  async function resolveLink(addr: string) {
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
  if (!data) return { ok: true } // no account for any known address — succeed quietly, never leak membership

  // Our own token_hash page instead of Supabase's PKCE action_link — works
  // without a code_verifier (any device) and isn't burned by security
  // scanners that fetch links without running JS.
  const tokenHash: string = data.properties.hashed_token
  const link = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}token_hash=${tokenHash}&type=recovery`
  const fullName: string | null = data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null
  const firstName = fullName?.split(' ')[0] ?? 'there'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

  const { subject, html, text } =
    mode === 'checkin'
      ? { subject: 'Quick midweek check-in — and your login’s sorted', html: buildCheckinEmail({ toFirstName: firstName, claimUrl: link }), text: buildCheckinText({ toFirstName: firstName, claimUrl: link }) }
      : mode === 'relaunch'
      ? { subject: 'TALK is fixed — your fresh link + what to test', html: buildTestInviteEmail({ toFirstName: firstName, claimUrl: link }), text: buildTestInviteText({ toFirstName: firstName, claimUrl: link }) }
      : mode === 'reset'
      ? { subject: 'Reset your TALK password', html: buildResetEmail({ toFirstName: firstName, resetUrl: link }), text: buildResetText({ toFirstName: firstName, resetUrl: link }) }
      : mode === 'duplicate'
      ? { subject: 'Here’s your TALK account', html: buildFoundExistingAccountEmail({ toFirstName: firstName, loginUrl: link }), text: buildFoundExistingAccountText({ toFirstName: firstName, loginUrl: link }) }
      : { subject: 'Welcome to the new TALK — claim your account', html: buildClaimEmail({ toFirstName: firstName, claimUrl: link }), text: buildClaimText({ toFirstName: firstName, claimUrl: link }) }

  await resend.emails.send({ from, replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com', to: email0, subject, html, text })
  return { ok: true }
}
