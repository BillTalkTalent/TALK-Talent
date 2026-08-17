import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Calendar, Building2, Lock, AlertTriangle } from 'lucide-react'
import { Resend } from 'resend'
import AdminMemberSearch from '@/components/admin-member-search'
import { requireSuperAdmin } from '@/lib/admin-auth'

async function approveMember(id: string) {
  'use server'
  try {
    await requireSuperAdmin()
    const supabase = await createClient()
    const admin = createAdminClient()

    // 1. Fetch the member's profile so we have email + name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, full_name, interested_event_id')
      .eq('id', id)
      .single()

    // 2. Approve them — the DB blocks this (profiles_require_linkedin_for_approval
    // trigger) if they have no LinkedIn URL on file, so surface that clearly
    // instead of silently sending a "you're approved" email for an approval
    // that didn't actually happen.
    const { error: approveError } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
    if (approveError) {
      throw new Error(
        approveError.message.includes('LinkedIn')
          ? approveError.message
          : `Failed to approve member: ${approveError.message}`
      )
    }

    // 2a. Auto-fill profile from legacy staging data (matched by linkedin_url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('match_legacy_member', { p_profile_id: id })

    // 3. Send approval email with a magic link so they can log straight in
    if (profile?.email) {
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

        // Generate a magic link (one-click login) — if they signed up wanting
        // to attend a specific event, drop them straight back on it instead
        // of the generic dashboard.
        const destination = profile.interested_event_id
          ? `${origin}/events/${profile.interested_event_id}`
          : `${origin}/dashboard`
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: profile.email,
          options: { redirectTo: destination },
        })
        const loginUrl = linkData?.properties?.action_link ?? `${origin}/login`

        const firstName = profile.full_name?.split(' ')[0] ?? 'there'
        const resend = new Resend(process.env.RESEND_API_KEY)
        const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
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
  } catch (err) {
    // An expected failure here (most commonly: no LinkedIn URL on file)
    // shouldn't throw — an uncaught error in a Server Action bubbles to the
    // nearest error boundary and replaces the *entire* app with the generic
    // error screen, taking down every other pending approval with it.
    // Surface it as a banner on the same page instead.
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to approve member'
    redirect(`/admin?error=${encodeURIComponent(message)}`)
  }
}

// A signup recognized themself among possible existing-profile matches
// (app/api/signup/find-matches) but with a different email than what's on
// file. Confirming here keeps the OLD profile — and everything attached to
// its id (forum posts, poll votes, chapter memberships, event RSVPs) — and
// just moves its login to the new email, rather than creating a second,
// history-less profile.
async function confirmMatch(newProfileId: string, oldProfileId: string) {
  'use server'
  await requireSuperAdmin()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: newProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', newProfileId)
    .single()

  if (!newProfile?.email) {
    return
  }

  // Order matters: auth.users.email is unique, so the duplicate account
  // holding the new email has to be deleted *before* the old account can
  // take it over — doing this the other way round fails outright.
  // Discard the duplicate pending account — cascades to its profiles row.
  await admin.auth.admin.deleteUser(newProfileId)

  await admin.auth.admin.updateUserById(oldProfileId, {
    email: newProfile.email,
    email_confirm: true,
  })
  // profiles.email is a denormalized copy of auth.users.email, not kept in
  // sync automatically — update it too or the old profile keeps showing
  // its previous email everywhere in the UI.
  await supabase.from('profiles').update({ status: 'approved', email: newProfile.email }).eq('id', oldProfileId)

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: newProfile.email,
      options: { redirectTo: `${origin}/dashboard` },
    })
    const loginUrl = linkData?.properties?.action_link ?? `${origin}/login`
    const firstName = newProfile.full_name?.split(' ')[0] ?? 'there'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'

    await resend.emails.send({
      from,
      replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
      to: newProfile.email,
      subject: "You're in — welcome back to TALK! 🎉",
      html: buildApprovalEmail(firstName, loginUrl, origin),
    })
  } catch (err) {
    console.error('[confirmMatch] email error:', err)
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
            <tr><td style="background:linear-gradient(135deg,#E8503A,#F07058);border-radius:10px;">
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
  try {
    await requireSuperAdmin()
    const id = formData.get('id') as string
    const note = (formData.get('note') as string)?.trim() || 'Does not meet community criteria'
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', id)
      .single()

    const { error: rejectError } = await supabase
      .from('profiles')
      .update({ status: 'rejected', rejection_note: note })
      .eq('id', id)
    if (rejectError) {
      throw new Error(`Failed to reject member: ${rejectError.message}`)
    }

    if (profile?.email) {
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
        const firstName = profile.full_name?.split(' ')[0] ?? 'there'
        const resend = new Resend(process.env.RESEND_API_KEY)
        const from = process.env.FROM_EMAIL ?? 'TALK Community <onboarding@resend.dev>'
        await resend.emails.send({
          from,
          replyTo: process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com',
          to: profile.email,
          subject: 'Your TALK membership application',
          html: buildRejectionEmail(firstName, origin),
        })
      } catch (err) {
        console.error('[rejectMember] email error:', err)
      }
    }

    revalidatePath('/admin')
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to reject member'
    redirect(`/admin?error=${encodeURIComponent(message)}`)
  }
}

async function setLinkedinUrl(id: string, formData: FormData) {
  'use server'
  try {
    await requireSuperAdmin()
    const url = (formData.get('linkedin_url') as string)?.trim()
    if (!url) {
      throw new Error('LinkedIn URL cannot be empty')
    }
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').update({ linkedin_url: url }).eq('id', id)
    if (error) {
      throw new Error(`Failed to save LinkedIn URL: ${error.message}`)
    }
    revalidatePath('/admin')
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to save LinkedIn URL'
    redirect(`/admin?error=${encodeURIComponent(message)}`)
  }
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: actionError } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: pendingMembers },
    { count: approvedCount },
    { count: pendingCount },
    { count: eventCount },
    { count: vendorCount },
    { data: viewerProfile },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('is_bot', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_test', false),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('is_superadmin').eq('id', user?.id ?? '').single(),
  ])

  const isSuperAdmin = !!viewerProfile?.is_superadmin

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claimedMatchIds = (pendingMembers ?? []).map((m: any) => m.claimed_match_id).filter(Boolean)
  const matchedProfiles = claimedMatchIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', claimedMatchIds)
    : { data: [] }
  const matchedNameById = new Map((matchedProfiles.data ?? []).map((p) => [p.id, p.full_name]))

  const stats = [
    { label: 'Approved Members', value: approvedCount ?? 0, icon: Users },
    { label: 'Pending Approvals', value: pendingCount ?? 0, icon: Clock },
    { label: 'Total Events', value: eventCount ?? 0, icon: Calendar },
    { label: 'Total Vendors', value: vendorCount ?? 0, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{actionError}</p>
        </div>
      )}

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

      {/* Find a member & send their claim link */}
      <AdminMemberSearch />

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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pendingMembers.map((member: any) => (
                <li key={member.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-zinc-900">{member.full_name}</p>
                    <p className="text-sm text-zinc-500">{member.email}</p>
                    {member.linkedin_url ? (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {member.linkedin_url}
                      </a>
                    ) : isSuperAdmin ? (
                      <form action={setLinkedinUrl.bind(null, member.id)} className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="url"
                          name="linkedin_url"
                          placeholder="No LinkedIn on file — paste URL…"
                          required
                          className="text-xs border border-amber-200 rounded-lg px-2 py-1 w-64 focus:outline-none focus:border-amber-400 text-zinc-700 placeholder:text-zinc-400"
                        />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors shrink-0"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">No LinkedIn on file</p>
                    )}
                    {member.claimed_match_id && (
                      <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                        Claims to be: {matchedNameById.get(member.claimed_match_id) ?? 'an existing profile'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                    {!isSuperAdmin ? (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400 italic">
                        <Lock className="size-3" />
                        Only the super admin can approve or reject
                      </span>
                    ) : (
                    <>
                    {member.claimed_match_id && (
                      <form action={confirmMatch.bind(null, member.id, member.claimed_match_id)}>
                        <Button type="submit" size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                          Confirm match & merge
                        </Button>
                      </form>
                    )}
                    <form action={approveMember.bind(null, member.id)}>
                      <Button type="submit" size="sm" variant="default">
                        {member.claimed_match_id ? 'Approve as new instead' : 'Approve'}
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
                    </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" render={<Link href="/admin/email" />}>
          Email Members
        </Button>
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
