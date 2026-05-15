import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Calendar, Building2 } from 'lucide-react'
import { Resend } from 'resend'

async function approveMember(id: string) {
  'use server'
  const supabase = await createClient()
  const admin = createAdminClient()

  // 1. Fetch the member's profile so we have email + name
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', id)
    .single()

  // 2. Approve them
  await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)

  // 2a. Auto-fill profile from legacy staging data (matched by linkedin_url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('match_legacy_member', { p_profile_id: id })

  // 3. Send approval email with a magic link so they can log straight in
  if (profile?.email) {
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'

      // Generate a magic link (one-click login)
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
        options: { redirectTo: `${origin}/dashboard` },
      })
      const loginUrl = linkData?.properties?.action_link ?? `${origin}/login`

      const firstName = profile.full_name?.split(' ')[0] ?? 'there'
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

      await resend.emails.send({
        from,
        to: profile.email,
        subject: "You're in — welcome to TALK! 🎉",
        html: buildApprovalEmail(firstName, loginUrl, origin),
      })
    } catch (err) {
      // Don't block the approval if email fails — log and continue
      console.error('[approveMember] email error:', err)
    }
  }

  revalidatePath('/admin')
}

function buildApprovalEmail(firstName: string, loginUrl: string, origin: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo header -->
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
          <span style="display:inline-block;width:6px;height:6px;background:linear-gradient(135deg,#9B5CFF,#6F2CFF);border-radius:50%;vertical-align:super;margin-left:1px;"></span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#0d0d0d;line-height:1.2;">
            You&rsquo;re in, ${firstName}! 🎉
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Your application to join the TALK Talent community has been approved.
            We&rsquo;re excited to have you — you&rsquo;re now part of a tight-knit group of
            talent professionals who share, learn, and grow together.
          </p>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:linear-gradient(135deg,#00b894,#00d4aa);border-radius:10px;">
              <a href="${loginUrl}"
                style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0d0d0d;text-decoration:none;border-radius:10px;">
                Get started →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
            This link logs you straight in — no password needed. It expires in 24 hours.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Once you&rsquo;re in, head to your dashboard and follow the getting-started checklist to set up your profile,
            join a chapter, and introduce yourself to the community.
            <br><br>
            Questions? Reply to this email — we&rsquo;re happy to help.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace('https://', '')}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function rejectMember(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const note = (formData.get('note') as string)?.trim() || 'Does not meet community criteria'
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', id)
    .single()

  await supabase.from('profiles').update({ status: 'rejected', rejection_note: note }).eq('id', id)

  if (profile?.email) {
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'
      const firstName = profile.full_name?.split(' ')[0] ?? 'there'
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
      await resend.emails.send({
        from,
        to: profile.email,
        subject: 'Your TALK membership application',
        html: buildRejectionEmail(firstName, origin),
      })
    } catch (err) {
      console.error('[rejectMember] email error:', err)
    }
  }

  revalidatePath('/admin')
}

function buildRejectionEmail(firstName: string, origin: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TALK</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0d0d0d;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
            Thank you for applying to join the TALK Talent community. After careful review,
            we&rsquo;re not able to offer membership at this time.
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
            TALK is a curated community and we receive more applications than we have capacity for.
            This decision is not a reflection of your experience or abilities.
          </p>
          <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
            We wish you well in your career. If you believe this decision was made in error,
            feel free to reply to this email.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            TALK Talent Community &bull; <a href="${origin}" style="color:#9ca3af;">${origin.replace('https://', '')}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { data: pendingMembers },
    { count: approvedCount },
    { count: pendingCount },
    { count: eventCount },
    { count: vendorCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Approved Members', value: approvedCount ?? 0, icon: Users },
    { label: 'Pending Approvals', value: pendingCount ?? 0, icon: Clock },
    { label: 'Total Events', value: eventCount ?? 0, icon: Calendar },
    { label: 'Total Vendors', value: vendorCount ?? 0, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-md">
                  <Icon className="size-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Approvals
            {(pendingCount ?? 0) > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingMembers || pendingMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">No pending applications.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pendingMembers.map((member) => (
                <li key={member.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-zinc-900">{member.full_name}</p>
                    <p className="text-sm text-zinc-500">{member.email}</p>
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {member.linkedin_url}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                    <form action={approveMember.bind(null, member.id)}>
                      <Button type="submit" size="sm" variant="default">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectMember} className="flex flex-col gap-1.5 items-end">
                      <input type="hidden" name="id" value={member.id} />
                      <textarea
                        name="note"
                        placeholder="Rejection reason (optional)…"
                        rows={2}
                        className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 w-48 resize-none focus:outline-none focus:border-red-300 text-zinc-600 placeholder:text-zinc-300"
                      />
                      <Button type="submit" size="sm" variant="destructive">
                        Reject
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" render={<Link href="/admin/members" />}>
          Manage Members
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin/events" />}>
          Manage Events
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin/vendors" />}>
          Manage Vendors
        </Button>
      </div>
    </div>
  )
}
