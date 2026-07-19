import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Admin-only: sends one email to Resend's bounce simulator so we can verify the
// bounce webhook end-to-end. Recipient is hardcoded to the test address; it can
// never send anywhere else.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL ?? 'TALK Community <hello@talktalent.com>',
    to: 'bounced@resend.dev',
    subject: 'TALK bounce-webhook test',
    html: '<p>Triggering a bounce to verify the TALK webhook.</p>',
  })
  return NextResponse.json({ ok: !error, id: data?.id ?? null, error: error?.message ?? null })
}
