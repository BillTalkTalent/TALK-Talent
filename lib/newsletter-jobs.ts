// Auto-generated "New jobs this week" block for the newsletter — pulls real,
// active job posts rather than relying on an admin to paste them into the
// Career Opportunities section by hand. Same graceful-hide-when-empty
// pattern as the events/stats blocks it sits alongside.
//
// These are genuinely posted by TALK members and their companies (real
// poster_id, real salary data where given) — worth saying so explicitly,
// since a reader has no way to tell that apart from a scraped listing just
// by looking at a title and company name.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterJob = {
  id: string
  title: string
  company: string
  location: string | null
  is_remote: boolean
  is_featured: boolean
  salary_min: number | null
  salary_max: number | null
  profiles: { full_name: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRecentJobsForNewsletter(adminDb: any, limit = 3): Promise<NewsletterJob[]> {
  const { data } = await adminDb
    .from('job_posts')
    .select('id, title, company, location, is_remote, is_featured, salary_min, salary_max, profiles(full_name)')
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  return fmt((min ?? max) as number)
}

// Returns '' (renders nothing) when there are no active jobs.
export function buildJobsBlock(jobs: NewsletterJob[], origin: string): string {
  if (jobs.length === 0) return ''

  const rows = jobs.map((j, i) => {
    const isLast = i === jobs.length - 1
    const where = j.is_remote ? 'Remote' : (j.location || 'Location TBD')
    const salary = formatSalary(j.salary_min, j.salary_max)
    const posterName = j.profiles?.full_name
    const url = `${origin}/jobs/${j.id}`
    const badges = [
      j.is_featured ? `<span style="display:inline-block;background:#fdece8;color:#E8503A;font-size:9px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:2px 7px;border-radius:20px;margin-right:6px;">Featured</span>` : '',
      salary ? `<span style="display:inline-block;background:#ecfdf3;color:#15803d;font-size:9px;font-weight:800;letter-spacing:0.02em;padding:2px 7px;border-radius:20px;margin-right:6px;">${esc(salary)}</span>` : '',
    ].join('')
    return `
      <tr>
        <td style="padding:12px 0;${isLast ? '' : 'border-bottom:1px solid #eef0f2;'}">
          ${badges ? `<p style="margin:0 0 5px;">${badges}</p>` : ''}
          <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(j.title)}</a>
          <p style="margin:3px 0 0;font-size:12px;color:#6b7280;">${esc(j.company)} &middot; ${esc(where)}</p>
          ${posterName ? `<p style="margin:3px 0 0;font-size:11px;color:#9ca3af;">Posted by ${esc(posterName)}, TALK member</p>` : ''}
        </td>
      </tr>`
  }).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="border:1px solid #eef0f2;border-radius:14px;padding:20px 22px;border-top:3px solid #0F1F35;">
      <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">New jobs this week</p>
      <p style="margin:4px 0 16px;font-size:13px;font-weight:600;color:#0F1F35;">Posted directly by TALK members and their companies — not pulled from a public job board.</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
      <a href="${origin}/jobs" style="display:inline-block;margin-top:14px;font-size:12px;font-weight:700;color:#4f46e5;text-decoration:none;">See all open roles &rarr;</a>
    </div>
  </td></tr>`
}
