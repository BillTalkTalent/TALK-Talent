import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewsletter } from '@/lib/newsletter-send'
import { getActiveSponsor, buildSponsorTop, buildSponsorBottom, buildSponsorMid } from '@/lib/newsletter-sponsor'
import { getUpcomingEventsForNewsletter, buildUpcomingEventsBlock } from '@/lib/newsletter-events'
import { getNewsletterStats, buildStatsBlock } from '@/lib/newsletter-stats'
import { getRecentJobsForNewsletter, buildJobsBlock } from '@/lib/newsletter-jobs'
import { getOpenToWorkForNewsletter, buildTalentBlock } from '@/lib/newsletter-talent'

export const maxDuration = 300

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

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const upcomingEvents = await getUpcomingEventsForNewsletter(adminDb, { windowDays: 7 })
  const eventsBlock = buildUpcomingEventsBlock(upcomingEvents, origin)
  const stats = await getNewsletterStats(adminDb)
  const statsBlock = buildStatsBlock(stats)
  const recentJobs = await getRecentJobsForNewsletter(adminDb)
  const jobsBlock = buildJobsBlock(recentJobs, origin)
  const openToWork = await getOpenToWorkForNewsletter(adminDb)
  const talentBlock = buildTalentBlock(openToWork, origin)

  const results = []
  for (const newsletter of newsletters) {
    const sponsor = newsletter.skip_sponsor ? null : await getActiveSponsor(adminDb, 'masthead')
    const midSponsor = newsletter.skip_sponsor ? null : await getActiveSponsor(adminDb, 'mid')
    const sponsorTop = sponsor ? buildSponsorTop(sponsor) : ''
    const sponsorBottom = sponsor ? buildSponsorBottom(sponsor) : ''
    const sponsorMid = midSponsor ? buildSponsorMid(midSponsor) : ''

    // Reaches all approved members (paginated), skips unsubscribes, throttled,
    // with a working unsubscribe link in every email.
    const { sent } = await sendNewsletter(
      adminDb,
      newsletter.subject,
      (firstName, unsubscribeUrl) => buildEmailHtml(newsletter.subject, newsletter.body_html, firstName, unsubscribeUrl, newsletter.intro, sponsorTop, sponsorBottom, eventsBlock, statsBlock, jobsBlock, talentBlock, sponsorMid),
      newsletter.id,
    )
    await adminDb.from('newsletters').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    }).eq('id', newsletter.id)
    results.push({ id: newsletter.id, sent })
  }

  return NextResponse.json({ sent: results })
}

// Matches the identical marker baked into body_html at save/schedule time by
// compileSectionsToHtml in app/api/admin/newsletter/route.ts.
const MID_AD_MARKER = '<!--MID_AD_SLOT-->'

function buildEmailHtml(subject: string, rawBodyHtml: string, memberName: string, unsubscribeUrl: string, intro = '', sponsorTop = '', sponsorBottom = '', eventsBlock = '', statsBlock = '', jobsBlock = '', talentBlock = '', sponsorMidHtml = '') {
  const introLine = (intro || '').trim() || "Here's your weekly roundup from the TALK community."
  const bodyHtml = rawBodyHtml.replace(MID_AD_MARKER, sponsorMidHtml)
  const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@900&display=swap" rel="stylesheet">
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
  <tr><td style="background:linear-gradient(90deg,#0F1F35 0%,#162D4A 100%);border-radius:16px 16px 0 0;padding:30px 36px 26px;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#F07058;text-transform:uppercase;letter-spacing:0.16em;">TALK Weekly &middot; ${issueDate}</p>
    <span style="font-family:'Poppins',-apple-system,BlinkMacSystemFont,sans-serif;font-size:32px;font-weight:900;letter-spacing:-0.03em;line-height:1;"><span style="color:#E8503A;">TA</span><span style="color:#ffffff;">LK</span></span>
    <p style="margin:12px 0 0;color:rgba(255,255,255,0.55);font-size:13.5px;line-height:1.5;">${subject}</p>
  </td></tr>
  <tr><td style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,#E8503A,#F07058);">&nbsp;</td></tr>
  <!-- Greeting — leads with the personal voice, ahead of the stats widget
       and sponsor banner below, so the newsletter opens like it's from a
       person, not a dashboard. -->
  <tr><td style="background:#fff;padding:32px 36px 0;">
    <p style="margin:0 0 6px;color:#374151;font-size:15px;">Hi ${memberName},</p>
    <p style="margin:0;color:#6b7280;font-size:14px;">${introLine}</p>
  </td></tr>
  ${statsBlock}
  ${eventsBlock}
  ${jobsBlock}
  ${talentBlock}
  <!-- Sponsor sits last among the auto-generated widgets, immediately
       before the written body — below every bit of real editorial content
       that comes before it (the intro), not in front of any of it. -->
  ${sponsorTop}
  <tr><td style="background:#fff;padding:8px 36px 32px;">
    <div class="prose">${bodyHtml}</div>
  </td></tr>
  ${sponsorBottom}
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
    <p style="margin:0 0 14px;color:#6b7280;font-size:12px;line-height:1.6;">
      TALK is a community for Talent Acquisition leaders to connect, share what's working, and grow together —
      through local chapters, events, and conversations like this one. <a href="https://www.talktalent.com" style="color:#6b7280;text-decoration:underline;">talktalent.com</a>
    </p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">You're receiving this as a TALK community member.</p>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TALK Community</p>
    <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}
