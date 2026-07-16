import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import {
  buildMentorshipRequestEmail,
  buildMentorshipAcceptedEmail,
  buildMentorshipDeclinedEmail,
} from '@/lib/email'

type EventType = 'requested' | 'accepted' | 'declined'

export async function POST(req: NextRequest) {
  try {
    const { requestId, event }: { requestId: string; event: EventType } = await req.json()
    if (!requestId || !event) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load the request with joined profiles and area name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: request } = await db
      .from('mentorship_requests')
      .select(`
        id, message, status,
        requester:profiles!mentorship_requests_requester_id_fkey(id, full_name, email),
        mentor:profiles!mentorship_requests_mentor_id_fkey(id, full_name, email),
        area:mentorship_areas(name)
      `)
      .eq('id', requestId)
      .single()

    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const requestUrl = `${origin}/mentorship/requests`
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = createAdminClient() as any

    const requester = request.requester as { id: string; full_name: string | null; email: string | null }
    const mentor    = request.mentor    as { id: string; full_name: string | null; email: string | null }
    const areaName  = (request.area as { name: string } | null)?.name ?? 'General mentorship'

    const requesterFirstName = requester.full_name?.split(' ')[0] ?? 'there'
    const mentorFirstName    = mentor.full_name?.split(' ')[0] ?? 'there'
    const requesterName      = requester.full_name ?? 'A member'
    const mentorName         = mentor.full_name ?? 'Your mentor'

    if (event === 'requested') {
      // Notify the MENTOR of the new request
      await adminDb.from('notifications').insert({
        user_id: mentor.id,
        type: 'mentorship_request',
        title: `${requesterName} requested you as a mentor`,
        body: `Focus area: ${areaName}`,
        link: requestUrl,
        is_read: false,
      })

      if (mentor.email) {
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: mentor.email,
          subject: `${requesterName} wants you as their mentor on TALK`,
          html: buildMentorshipRequestEmail({
            toFirstName: mentorFirstName,
            requesterName,
            areaName,
            message: request.message ?? '',
            requestUrl,
          }),
        })
      }
    } else if (event === 'accepted') {
      // Notify the REQUESTER that their request was accepted
      await adminDb.from('notifications').insert({
        user_id: requester.id,
        type: 'mentorship_accepted',
        title: `${mentorName} accepted your mentorship request`,
        body: `Focus area: ${areaName}`,
        link: requestUrl,
        is_read: false,
      })

      if (requester.email) {
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: requester.email,
          subject: `${mentorName} accepted your mentorship request on TALK`,
          html: buildMentorshipAcceptedEmail({
            toFirstName: requesterFirstName,
            mentorName,
            areaName,
            requestUrl,
          }),
        })
      }
    } else if (event === 'declined') {
      // Notify the REQUESTER (gently)
      await adminDb.from('notifications').insert({
        user_id: requester.id,
        type: 'mentorship_declined',
        title: `Mentorship request update`,
        body: `${mentorName} isn't able to take on new mentees for ${areaName} right now.`,
        link: `${origin}/mentorship`,
        is_read: false,
      })

      if (requester.email) {
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: requester.email,
          subject: `Update on your mentorship request`,
          html: buildMentorshipDeclinedEmail({
            toFirstName: requesterFirstName,
            mentorName,
            areaName,
            requestUrl,
          }),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mentorship/notify]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
