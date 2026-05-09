import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const SECTION_META: Record<string, { label: string; color: string }> = {
  talk_news:            { label: 'TALK News',             color: '#00b894' },
  member_highlight:     { label: 'Member Highlight',      color: '#f59e0b' },
  industry_news:        { label: 'Industry News',         color: '#3b82f6' },
  career_opportunities: { label: 'Career Opportunities',  color: '#8b5cf6' },
  vendor_highlight:     { label: 'Vendor Highlight',      color: '#ec4899' },
}

const SECTION_ORDER = ['talk_news', 'member_highlight', 'industry_news', 'career_opportunities', 'vendor_highlight']

function compileSectionsToHtml(sections: Record<string, string>): string {
  return SECTION_ORDER
    .filter(key => sections[key] && sections[key] !== '<p></p>' && sections[key].trim())
    .map(key => {
      const meta = SECTION_META[key]
      return `
        <div style="margin-bottom:32px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <div style="height:3px;width:20px;border-radius:99px;background:${meta.color};display:inline-block;"></div>
            <span style="font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${meta.color};">${meta.label}</span>
            <div style="height:1px;flex:1;background:#f3f4f6;display:inline-block;"></div>
          </div>
          <div style="color:#374151;font-size:15px;line-height:1.7;">${sections[key]}</div>
        </div>`
    }).join('\n')
}

function buildEmailHtml(subject: string, sections: Record<string, string>, memberName: string): string {
  const sectionsHtml = compileSectionsToHtml(sections)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  p{margin:0 0 12px;line-height:1.7;}
  h1,h2,h3{color:#111827;margin:0 0 10px;}
  ul,ol{padding-left:1.5em;margin:0 0 12px;}
  li{margin-bottom:4px;line-height:1.6;}
  a{color:#00b894;}
  strong{color:#111827;}
  hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0;}
  blockquote{border-left:3px solid #00d4aa;padding-left:12px;margin:0 0 12px;color:#6b7280;font-style:italic;}
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(90deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 36px;">
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
          <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">TALK</span>
        </td>
      </tr>
    </table>
    <p style="margin:10px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.4;">${subject}</p>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="background:#fff;padding:32px 36px 8px;">
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${memberName},</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:24px;">Here's your weekly roundup from the TALK community.</p>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin-bottom:28px;">
  </td></tr>

  <!-- Sections -->
  <tr><td style="background:#fff;padding:0 36px 32px;">
    ${sectionsHtml}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;padding:24px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">You're receiving this as a TALK community member.</p>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TALK Community · For TA Leaders</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, subject, previewText, sections, action, scheduledFor } = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  const bodyHtml = compileSectionsToHtml(sections ?? {})

  const payload = {
    subject: subject ?? '',
    preview_text: previewText ?? null,
    body_html: bodyHtml,
    sections_json: sections ?? {},
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

  const { data: members } = await adminDb
    .from('profiles')
    .select('email, full_name')
    .eq('status', 'approved')

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No members found' }, { status: 400 })
  }

  const resend = new Resend(resendKey)
  const batchSize = 50
  let sent = 0

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize)
    await resend.batch.send(
      batch.map((m: { email: string; full_name: string | null }) => ({
        from: 'TALK Community <onboarding@resend.dev>',
        to: m.email,
        subject,
        html: buildEmailHtml(subject, sections ?? {}, m.full_name?.split(' ')[0] ?? 'there'),
      }))
    )
    sent += batch.length
  }

  await adminDb.from('newsletters').update({ recipient_count: sent }).eq('id', newsletterId)

  return NextResponse.json({ success: true, recipientCount: sent })
}
