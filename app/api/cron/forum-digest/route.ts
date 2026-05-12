import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

  // Find all topics posted in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: topics } = await supabase
    .from('forum_topics')
    .select('id, title, body, created_at, category_id, author_id, forum_categories(name, slug), profiles(full_name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!topics || topics.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No new posts in the last 24 hours' })
  }

  // Get all approved members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('status', 'approved')
    .not('email', 'is', null)

  if (!members || members.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No members to notify' })
  }

  type TopicRow = (typeof topics)[number]

  // Build the digest email HTML
  function buildDigestEmail(firstName: string, topicList: TopicRow[]): string {
    const topicRows = topicList.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const category = (t as any).forum_categories as { name: string; slug: string } | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const author = (t as any).profiles as { full_name: string | null } | null
      const snippet = t.body.length > 120 ? t.body.slice(0, 120) + '…' : t.body
      const link = `${origin}/forum/${category?.slug ?? ''}/${t.id}`

      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #f0f0f0;">
            <a href="${link}" style="font-size: 15px; font-weight: 700; color: #0d0d0d; text-decoration: none; display: block; margin-bottom: 4px;">
              ${t.title}
            </a>
            <div style="font-size: 12px; color: #888; margin-bottom: 6px;">
              ${category?.name ?? 'Forum'} · by ${author?.full_name ?? 'a member'}
            </div>
            <div style="font-size: 13px; color: #555; line-height: 1.5;">${snippet}</div>
            <a href="${link}" style="display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600; color: #00b894; text-decoration: none;">
              Read &amp; Reply →
            </a>
          </td>
        </tr>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0d0d0d,#1a1a2e);padding:28px 32px;">
            <div style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.5px;">TALK</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:2px;">Daily Community Digest</div>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#0d0d0d;">Hi ${firstName},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Here's what your community has been discussing in the last 24 hours.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${topicRows}
            </table>

            <div style="margin-top:28px;text-align:center;">
              <a href="${origin}/forum"
                style="display:inline-block;padding:12px 28px;background:#00d4aa;color:#0d0d0d;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
                View All Discussions
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#aaa;">
              You're receiving this because you're a TALK community member.<br>
              <a href="${origin}/profile" style="color:#aaa;">Manage preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Send in batches of 100 (Resend batch limit)
  const BATCH_SIZE = 100
  let totalSent = 0
  const errors: string[] = []

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE)

    const emails = batch
      .filter(m => m.email)
      .map(m => {
        const firstName = m.full_name?.split(' ')[0] ?? 'there'
        return {
          from,
          to: m.email!,
          subject: `💬 ${topics!.length} new discussion${topics!.length > 1 ? 's' : ''} in TALK today`,
          html: buildDigestEmail(firstName, topics!),
        }
      })

    if (emails.length === 0) continue

    const { error } = await resend.batch.send(emails)
    if (error) {
      errors.push(String(error))
    } else {
      totalSent += emails.length
    }
  }

  return NextResponse.json({
    sent: totalSent,
    topics: topics.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
