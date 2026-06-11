import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { buildClaimEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Generate a recovery link WITHOUT Supabase sending it — we send via Resend.
    // Works for imported members (confirmed email, no password yet).
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/auth/reset-password?claim=1` },
    })

    // If the email isn't a member, Supabase errors — swallow it and still return
    // success so we never leak who is or isn't a member.
    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ ok: true })
    }

    const claimUrl: string = data.properties.action_link
    const fullName: string | null =
      data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null
    const firstName = fullName?.split(' ')[0] ?? 'there'

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
    await resend.emails.send({
      from,
      to: email,
      subject: 'Welcome to the new TALK — claim your account',
      html: buildClaimEmail({ toFirstName: firstName, claimUrl }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/claim]', err)
    // Still return ok to avoid leaking membership / breaking the UX
    return NextResponse.json({ ok: true })
  }
}
