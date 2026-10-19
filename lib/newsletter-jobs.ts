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
  // Strictly newest-to-oldest — a featured-first secondary sort used to
  // override this, which could show an older featured post ahead of a
  // newer one.
  const { data } = await adminDb
    .from('job_posts')
    .select('id, title, company, location, is_remote, is_featured, salary_min, salary_max, profiles(full_name)')
    .eq('status', 'active')
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

  // A plain badge-plus-content div, matching the visual language of the
  // admin-composed sections it now sits between (compileSectionsToHtml in
  // the newsletter routes) — not its old bordered card with its own
  // gradient top bar. That styling was fine back when this was the only
  // auto-generated widget in its stretch of the newsletter, but sandwiched
  // between Industry News and Career Opportunities (both plain badge+text,
  // no border), a boxed card read as a different, unrelated thing dropped
  // into the middle of the content — which is what looked like the
  // newsletter breaking into two pieces. (Also must stay a <div>, never a
  // standalone <tr><td>: this gets spliced into sectionsHtml, which already
  // sits inside one <td> cell of the outer table — a nested <tr><td> there
  // is invalid HTML and gets hoisted out by email clients, which is the
  // first thing that broke here.)
  return `
  <div style="margin-bottom:36px;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
      <td style="background:#E8503A;border-radius:6px;padding:6px 14px;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;">TALK Job Board</span>
      </td>
    </tr></table>
    <div style="color:#374151;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 14px;font-size:13px;color:#6b7280;">Posted directly by TALK members and their companies — not pulled from a public job board.</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
      <a href="${origin}/jobs" style="display:inline-block;margin-top:14px;font-size:12px;font-weight:700;color:#4f46e5;text-decoration:none;">See all open roles &rarr;</a>
      <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #f3f4f6;">
        <a href="${origin}/jobs/new" style="font-size:12.5px;font-weight:700;color:#E8503A;text-decoration:none;">Have a job for the community? Click here &rarr;</a>
      </p>
    </div>
  </div>`
}
