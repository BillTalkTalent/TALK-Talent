import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  // Find newsletters scheduled for now (within the last 10 minutes)
  const now = new Date()
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)

  const { data: newsletters } = await adminDb
    .from('newsletters')
    .select('*')
    .eq('status', 'scheduled')
    .gte('scheduled_for', tenMinAgo.toISOString())
    .lte('scheduled_for', now.toISOString())

  if (!newsletters || newsletters.length === 0) {
    return NextResponse.json({ message: 'No newsletters to send' })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const resend = new Resend(resendKey)

  const { data: members } = await adminDb
    .from('profiles')
    .select('email, full_name')
    .eq('status', 'approved')

  if (!members || members.length === 0) {
    return NextResponse.json({ message: 'No members' })
  }

  const results = []
  for (const newsletter of newsletters) {
    const batchSize = 50
    let sent = 0
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      await resend.batch.send(
        batch.map((m: { email: string; full_name: string | null }) => ({
          from: process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>',
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: m.email,
          subject: newsletter.subject,
          html: buildEmailHtml(newsletter.subject, newsletter.body_html, m.full_name?.split(' ')[0] ?? 'there'),
        }))
      )
      sent += batch.length
    }
    await adminDb.from('newsletters').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    }).eq('id', newsletter.id)
    results.push({ id: newsletter.id, sent })
  }

  return NextResponse.json({ sent: results })
}

function buildEmailHtml(subject: string, bodyHtml: string, memberName: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  .prose h2,.prose h3{color:#111827;margin-top:1.5em;margin-bottom:0.5em;}
  .prose p{margin:0 0 1em;color:#374151;line-height:1.7;}
  .prose ul,.prose ol{padding-left:1.5em;margin:0 0 1em;color:#374151;}
  .prose li{margin-bottom:0.4em;line-height:1.6;}
  .prose a{color:#E8503A;}
  .prose strong{color:#111827;}
  .prose hr{border:none;border-top:1px solid #e5e7eb;margin:2em 0;}
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
  <tr><td style="background:linear-gradient(90deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:24px 36px;">
    <span style="color:#fff;font-size:20px;font-weight:900;">TALK</span>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">${subject}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px 36px 0;">
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Hi ${memberName},</p>
  </td></tr>
  <tr><td style="background:#fff;padding:0 36px 32px;">
    <div class="prose">${bodyHtml}</div>
  </td></tr>
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">You're receiving this as a TALK community member.</p>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TALK Community</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
