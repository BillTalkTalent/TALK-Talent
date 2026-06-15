import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { buildClaimEmail, buildResetEmail, buildTestInviteEmail } from '@/lib/email'

type Mode = 'claim' | 'reset' | 'relaunch'

export async function POST(req: NextRequest) {
  try {
    const { email, mode = 'claim' } = (await req.json()) as { email?: string; mode?: Mode }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    const redirectTo =
      mode === 'reset'
        ? `${origin}/auth/reset-password`
        : `${origin}/auth/reset-password?claim=1`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Generate a recovery link WITHOUT Supabase sending it — we send via Resend.
    // Works for imported members (confirmed email, no password yet) and returning users.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    // If the email isn't a member, Supabase errors — swallow it and still return
    // success so we never leak who is or isn't a member.
    if (error || !data?.properties?.action_link) {
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

    const { subject, html } =
      mode === 'relaunch'
        ? {
            subject: 'TALK is fixed — your fresh link + what to test',
            html: buildTestInviteEmail({ toFirstName: firstName, claimUrl: link }),
          }
        : mode === 'reset'
        ? {
            subject: 'Reset your TALK password',
            html: buildResetEmail({ toFirstName: firstName, resetUrl: link }),
          }
        : {
            subject: 'Welcome to the new TALK — claim your account',
            html: buildClaimEmail({ toFirstName: firstName, claimUrl: link }),
          }

    await resend.emails.send({ from, replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com', to: email, subject, html })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/recovery]', err)
    // Still return ok to avoid leaking membership / breaking the UX
    return NextResponse.json({ ok: true })
  }
}
