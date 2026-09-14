import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// Nudges approved members who have no name on file yet — the accounts that
// were sorting to the front of /members looking blank (see migration 091).
// Most of these came from the "invite a colleague" flow before it required
// a name; this closes the loop by asking the person themselves to finish
// their profile, rather than leaving it permanently empty. Runs daily,
// tracks profile_nudge_sent_at so each account only gets this once.
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

  const { data: incomplete } = await db
    .from('profiles')
    .select('id, email')
    .eq('status', 'approved')
    .eq('is_bot', false)
    .is('full_name', null)
    .is('profile_nudge_sent_at', null)
    .limit(200)

  if (!incomplete || incomplete.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No incomplete profiles pending' })
  }

  let sent = 0
  for (const profile of incomplete as { id: string; email: string }[]) {
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
        options: { redirectTo: `${origin}/profile` },
      })
      const loginUrl = linkData?.properties?.action_link ?? `${origin}/login`

      await resend.emails.send({
        from,
        replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
        to: profile.email,
        subject: 'Finish setting up your TALK profile',
        html: buildNudgeEmail(loginUrl, origin),
      })

      await db
        .from('profiles')
        .update({ profile_nudge_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      sent += 1
    } catch (err) {
      console.error(`[incomplete-profile-nudge] failed for profile ${profile.id}:`, err)
      // Leave profile_nudge_sent_at null so the next run retries it.
    }
  }

  return NextResponse.json({ sent, total: incomplete.length })
}

function buildNudgeEmail(loginUrl: string, origin: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0d0d0d;line-height:1.2;">
            Your TALK profile is missing a name and photo
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
            You're already a member of TALK, the community for TA leaders, but your profile is
            still blank — no name, no title, no photo. Other members can't tell who you are in
            the directory.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Takes two minutes to fix.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td style="background:linear-gradient(135deg,#E8503A,#F07058);border-radius:10px;">
              <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:10px;">
                Complete your profile →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
            This link logs you straight in — no password needed.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace('https://', '')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
