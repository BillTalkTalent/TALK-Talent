// Shared "who does an Email Members send reach" logic — used by the admin
// composer's server actions (app/admin/email/email-actions.ts) AND the
// scheduled-send cron job (app/api/cron/send-member-emails). Deliberately
// NOT a 'use server' file: every export from one of those becomes a
// network-callable server action, and these functions return raw member
// email addresses with no auth check of their own — the callers are
// responsible for gating access (requireAdmin/requireSuperAdmin, or the
// cron's secret header) before calling in.
import { createAdminClient } from '@/lib/supabase/admin'

// Only role that's meaningful to target directly — everyone else is 'member'
// or 'admin', and admins aren't a mailing audience in their own right.
export type AudienceRole = 'board_member'

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Chapter member ids for a chapter-scoped send — null chapterId means
// "everyone," no membership filter applied.
async function fetchChapterMemberIds(admin: ReturnType<typeof createAdminClient>, chapterId: string): Promise<string[]> {
  const { data } = await admin.from('chapter_memberships').select('user_id').eq('chapter_id', chapterId)
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

// Pull every approved member's email, paginating past Supabase's 1k row cap.
// Restricts to a single chapter's members when chapterId is given, and/or to
// a single role (e.g. board members) when role is given — the two combine,
// so "board members in the Boston chapter" is just both filters at once.
export async function fetchApprovedEmails(
  admin: ReturnType<typeof createAdminClient>,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<string[]> {
  let memberIdFilter: string[] | null = null
  if (chapterId) {
    memberIdFilter = await fetchChapterMemberIds(admin, chapterId)
    if (memberIdFilter.length === 0) return []
  }

  const emails = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from('profiles')
      .select('email')
      .eq('status', 'approved')
      .eq('is_bot', false)
      .not('email', 'is', null)
    if (memberIdFilter) query = query.in('id', memberIdFilter)
    if (role) query = query.eq('role', role)
    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    for (const r of data as { email: string | null }[]) {
      const e = (r.email ?? '').toLowerCase().trim()
      if (isEmail(e)) emails.add(e)
    }
    if (data.length < pageSize) break
  }
  return [...emails]
}

export async function fetchUnsubscribed(admin: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const set = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('email_unsubscribes')
      .select('email')
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    for (const r of data as { email: string }[]) set.add(r.email.toLowerCase().trim())
    if (data.length < pageSize) break
  }
  return set
}

// Recipient list for a send/schedule with this chapter + role scope, minus
// anyone unsubscribed. `skipped` is how many were filtered out that way.
export async function resolveAudience(
  admin: ReturnType<typeof createAdminClient>,
  chapterId?: string | null,
  role?: AudienceRole | null,
): Promise<{ recipients: string[]; skipped: number }> {
  const [allEmails, unsub] = await Promise.all([
    fetchApprovedEmails(admin, chapterId, role),
    fetchUnsubscribed(admin),
  ])
  const recipients = allEmails.filter((e) => !unsub.has(e))
  return { recipients, skipped: allEmails.length - recipients.length }
}
