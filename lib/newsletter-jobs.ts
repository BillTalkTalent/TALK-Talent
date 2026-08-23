// Auto-generated "New jobs this week" block for the newsletter — pulls real,
// active job posts rather than relying on an admin to paste them into the
// Career Opportunities section by hand. Same graceful-hide-when-empty
// pattern as the events/stats blocks it sits alongside.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterJob = {
  id: string
  title: string
  company: string
  location: string | null
  is_remote: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRecentJobsForNewsletter(adminDb: any, limit = 3): Promise<NewsletterJob[]> {
  const { data } = await adminDb
    .from('job_posts')
    .select('id, title, company, location, is_remote')
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

// Returns '' (renders nothing) when there are no active jobs.
export function buildJobsBlock(jobs: NewsletterJob[], origin: string): string {
  if (jobs.length === 0) return ''

  const rows = jobs.map((j, i) => {
    const isLast = i === jobs.length - 1
    const where = j.is_remote ? 'Remote' : (j.location || 'Location TBD')
    const url = `${origin}/jobs/${j.id}`
    return `
      <tr>
        <td style="padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #eef0f2;'}">
          <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(j.title)}</a>
          <p style="margin:3px 0 0;font-size:12px;color:#6b7280;">${esc(j.company)} &middot; ${esc(where)}</p>
        </td>
      </tr>`
  }).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="border:1px solid #eef0f2;border-radius:12px;padding:20px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">New jobs this week</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
      <a href="${origin}/jobs" style="display:inline-block;margin-top:14px;font-size:12px;font-weight:700;color:#4f46e5;text-decoration:none;">See all open roles &rarr;</a>
    </div>
  </td></tr>`
}
