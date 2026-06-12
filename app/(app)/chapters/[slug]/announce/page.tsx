import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

async function sendAnnouncement(formData: FormData) {
  'use server'
  const slug = formData.get('slug') as string
  const subject = (formData.get('subject') as string)?.trim()
  const message = (formData.get('message') as string)?.trim()
  if (!slug || !subject || !message) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'board_member' && profile.role !== 'admin')) {
    throw new Error('Not authorized')
  }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  if (!chapter) throw new Error('Chapter not found')

  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', chapter.id)
  const memberIds = (memberships ?? []).map(m => m.user_id)
  if (memberIds.length === 0) return

  const { data: members } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', memberIds)
    .eq('status', 'approved')

  const emails = (members ?? []).map(m => m.email).filter(Boolean) as string[]
  if (emails.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'
  const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="border-left: 4px solid #F07058; padding-left: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Chapter Announcement · ${chapter.name}</p>
        <h1 style="margin: 8px 0 0 0; font-size: 22px; color: #0d0d0d;">${subject}</h1>
      </div>
      <div style="font-size: 14px; line-height: 1.7; color: #27272a; white-space: pre-wrap;">${message.replace(/</g, '&lt;')}</div>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">
      <p style="font-size: 12px; color: #71717a;">
        Sent by <strong>${profile.full_name ?? 'a chapter lead'}</strong> ·
        <a href="${origin}/chapters/${chapter.slug}" style="color: #E8503A;">View chapter</a> ·
        <a href="${origin}/notifications/settings" style="color: #71717a;">Notification settings</a>
      </p>
    </div>
  `

  await Promise.allSettled(
    emails.map(email =>
      resend.emails.send({
        from,
        replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
        to: email,
        subject: `[${chapter.name}] ${subject}`,
        html,
      })
    )
  )

  revalidatePath(`/chapters/${slug}`)
  redirect(`/chapters/${slug}?announced=1`)
}

export default async function AnnouncePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'board_member' && profile.role !== 'admin')) {
    notFound()
  }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  if (!chapter) notFound()

  const { count } = await supabase
    .from('chapter_memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('chapter_id', chapter.id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href={`/chapters/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Back to {chapter.name}
      </Link>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)' }}>
          <Megaphone className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Send a chapter announcement</h1>
          <p className="text-sm text-zinc-500">Email will be sent to {count ?? 0} chapter member{count === 1 ? '' : 's'}.</p>
        </div>
      </div>

      <form action={sendAnnouncement} className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700">Subject</label>
          <input
            name="subject"
            required
            maxLength={140}
            placeholder="What's the announcement?"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700">Message</label>
          <textarea
            name="message"
            required
            rows={10}
            placeholder="Share the details with the chapter…"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0d0d0d] hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)' }}
          >
            <Megaphone className="size-4" /> Send Announcement
          </button>
        </div>
      </form>
    </div>
  )
}
