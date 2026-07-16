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

    // Load the conversation to find the recipient
    const { data: conv } = await supabase
      .from('dm_conversations')
      .select('participant_a, participant_b')
      .eq('id', conversationId)
      .single()

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const recipientId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a

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
    const [{ data: sender }, { data: recipient }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('profiles').select('full_name, email').eq('id', recipientId).single(),
    ])

    if (!recipient?.email) return NextResponse.json({ ok: true, skipped: 'no-email' })

    const senderName = sender?.full_name ?? 'A TALK member'
    const recipientFirstName = recipient.full_name?.split(' ')[0] ?? 'there'
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const convUrl = `${origin}/messages`
    const preview = messageContent.length > 200 ? messageContent.slice(0, 197) + '…' : messageContent

    // Write in-app notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any
    await adminDb.from('notifications').insert({
      user_id: recipientId,
      type: 'dm',
      title: `${senderName} sent you a message`,
      body: preview,
      link: '/messages',
      is_read: false,
    })

    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: recipient.email,
      subject: `${senderName} sent you a message on TALK`,
      html: buildDmEmail({ toFirstName: recipientFirstName, fromName: senderName, preview, convUrl }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dm/notify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
