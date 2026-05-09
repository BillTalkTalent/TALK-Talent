import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function buildEmailHtml(subject: string, bodyHtml: string, memberName: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  .prose h1,.prose h2,.prose h3{color:#111827;margin-top:1.5em;margin-bottom:0.5em;}
  .prose p{margin:0 0 1em;color:#374151;line-height:1.7;}
  .prose ul,.prose ol{padding-left:1.5em;margin:0 0 1em;color:#374151;}
  .prose li{margin-bottom:0.4em;line-height:1.6;}
  .prose a{color:#00b894;text-decoration:underline;}
  .prose strong{color:#111827;}
  .prose hr{border:none;border-top:1px solid #e5e7eb;margin:2em 0;}
  .prose blockquote{border-left:3px solid #00d4aa;padding-left:1em;margin:1em 0;color:#6b7280;font-style:italic;}
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(90deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:24px 36px;">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="34" height="34" rx="9" fill="#00d4aa"/>
            <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
            <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
          </svg>
        </td>
        <td style="vertical-align:middle;">
          <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.02em;">TALK</span>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">${subject}</p>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="background:#fff;padding:32px 36px 0;">
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">Hi ${memberName},</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:0 36px 32px;">
    <div class="prose">${bodyHtml}</div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">You're receiving this as a TALK community member.</p>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TALK Community</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, subject, previewText, bodyHtml, action, scheduledFor } = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  // Upsert newsletter record
  const payload = {
    subject: subject ?? '',
    preview_text: previewText ?? null,
    body_html: bodyHtml ?? '',
    created_by: user.id,
    ...(action === 'schedule' ? { status: 'scheduled', scheduled_for: scheduledFor } : {}),
    ...(action === 'send' ? { status: 'sent', sent_at: new Date().toISOString() } : {}),
  }

  let newsletterId = id
  if (id) {
    await adminDb.from('newsletters').update(payload).eq('id', id)
  } else {
    const { data } = await adminDb.from('newsletters').insert(payload).select('id').single()
    newsletterId = data?.id
  }

  if (action === 'save' || action === 'schedule') {
    return NextResponse.json({ success: true, id: newsletterId })
  }

  // === SEND ===
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  // Get all approved members
  const { data: members } = await adminDb
    .from('profiles')
    .select('email, full_name')
    .eq('status', 'approved')

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No members found' }, { status: 400 })
  }

  const resend = new Resend(resendKey)

  // Send in batches of 50
  const batchSize = 50
  let sent = 0
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize)
    await resend.batch.send(
      batch.map((m: { email: string; full_name: string | null }) => ({
        from: 'TALK Community <onboarding@resend.dev>',
        to: m.email,
        subject,
        html: buildEmailHtml(subject, bodyHtml, m.full_name?.split(' ')[0] ?? 'there'),
      }))
    )
    sent += batch.length
  }

  // Update recipient count
  await adminDb.from('newsletters').update({ recipient_count: sent }).eq('id', newsletterId)

  return NextResponse.json({ success: true, recipientCount: sent })
}
