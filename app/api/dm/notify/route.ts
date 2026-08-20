import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { buildDmEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { conversationId, messageContent } = await req.json()
    if (!conversationId || !messageContent) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load every other participant in the conversation (works for both 1:1
    // and group conversations — 1:1 is just the N=1 case).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: participantRows } = await (supabase as any)
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)

    const recipientIds = ((participantRows ?? []) as { user_id: string }[])
      .map((p) => p.user_id)
      .filter((id) => id !== user.id)

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Only send if this is the first unread message from sender in this conversation.
    // This prevents spamming when the two parties are actively chatting.
    const { count: existingUnread } = await supabase
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_id', user.id)
      .eq('is_read', false)

    // existingUnread > 1 means this isn't the first unread — skip
    if ((existingUnread ?? 0) > 1) {
      return NextResponse.json({ ok: true, skipped: 'already-has-unread' })
    }

    // Load sender + recipient profiles
    const [{ data: sender }, { data: recipients }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('profiles').select('id, full_name, email').in('id', recipientIds),
    ])

    const senderName = sender?.full_name ?? 'A TALK member'
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const convUrl = `${origin}/messages`
    const preview = messageContent.length > 200 ? messageContent.slice(0, 197) + '…' : messageContent

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

    await Promise.all(
      (recipients ?? []).map(async (recipient) => {
        // Write in-app notification
        await adminDb.from('notifications').insert({
          user_id: recipient.id,
          type: 'dm',
          title: `${senderName} sent you a message`,
          body: preview,
          link: '/messages',
          is_read: false,
        })

        if (!recipient.email) return
        const recipientFirstName = recipient.full_name?.split(' ')[0] ?? 'there'
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: recipient.email,
          subject: `${senderName} sent you a message on TALK`,
          html: buildDmEmail({ toFirstName: recipientFirstName, fromName: senderName, preview, convUrl }),
        })
      })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dm/notify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
