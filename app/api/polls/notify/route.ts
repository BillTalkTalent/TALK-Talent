import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { emailShell, ctaButton, quoteBlock } from '@/lib/email'
import { loadPrefs, wants } from '@/lib/notification-prefs'

// Notify a poll's creator (and, for comments, prior commenters) when someone
// interacts. Comments → in-app + email; votes → in-app only, de-duped so a busy
// poll doesn't spam the creator with one alert per vote.
export async function POST(req: NextRequest) {
  try {
    const { pollId, kind, commentBody } = (await req.json()) as {
      pollId?: string
      kind?: 'comment' | 'vote'
      commentBody?: string
    }
    if (!pollId || (kind !== 'comment' && kind !== 'vote')) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: poll } = await supabase
      .from('polls')
      .select('id, question, created_by')
      .eq('id', pollId)
      .single()
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

    // Recipients: the poll creator, plus prior commenters for a comment — never
    // the person who just acted.
    const ids = new Set<string>()
    if (poll.created_by && poll.created_by !== user.id) ids.add(poll.created_by)
    if (kind === 'comment') {
      const { data: prior } = await supabase.from('poll_comments').select('user_id').eq('poll_id', pollId)
      for (const r of prior || []) if (r.user_id && r.user_id !== user.id) ids.add(r.user_id)
    }
    const notifyIds = [...ids]
    if (notifyIds.length === 0) return NextResponse.json({ ok: true, skipped: 'no-recipients' })

    const { data: actor } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const actorName = actor?.full_name ?? 'A community member'
    const { data: recipients } = await supabase.from('profiles').select('id, full_name, email').in('id', notifyIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any
    const prefs = await loadPrefs(adminDb, notifyIds)

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const link = `/polls/${pollId}`
    const url = `${origin}${link}`
    const qShort = poll.question.length > 60 ? poll.question.slice(0, 57) + '…' : poll.question
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

    await Promise.allSettled(
      (recipients ?? []).map(async (r) => {
        if (kind === 'vote') {
          if (!wants(prefs, r.id, 'push_poll_votes')) return
          // De-dup: one unread "new vote" nudge per poll until they read it.
          const { count } = await adminDb
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', r.id).eq('type', 'poll_vote').eq('link', link).eq('is_read', false)
          if ((count ?? 0) > 0) return
          await adminDb.from('notifications').insert({
            user_id: r.id, type: 'poll_vote',
            title: `New vote on your poll “${qShort}”`, body: null, link, is_read: false,
          })
          return
        }

        // comment
        const commentPreview = commentBody
          ? (commentBody.length > 100 ? commentBody.slice(0, 97) + '…' : commentBody)
          : null
        if (wants(prefs, r.id, 'push_poll_comments')) {
          await adminDb.from('notifications').insert({
            user_id: r.id, type: 'poll_comment',
            title: `${actorName} commented on “${qShort}”`, body: commentPreview, link, is_read: false,
          })
        }
        if (r.email && wants(prefs, r.id, 'email_poll_comments')) {
          const firstName = r.full_name?.split(' ')[0] ?? 'there'
          await resend.emails.send({
            from,
            replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
            to: r.email,
            subject: `${actorName} commented on a poll on TALK`,
            html: emailShell(`
              <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">New comment on your poll</p>
              <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
                Hi ${firstName}, <strong style="color:#0F1F35;">${actorName}</strong> commented on
                &ldquo;<em>${poll.question}</em>&rdquo;.
              </p>
              ${commentBody ? quoteBlock(commentBody) : ''}
              ${ctaButton('View the poll', url)}
            `),
          })
        }
      }),
    )

    return NextResponse.json({ ok: true, notified: notifyIds.length })
  } catch (err) {
    console.error('[polls/notify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
