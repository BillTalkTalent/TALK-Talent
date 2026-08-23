// Auto-generated "Members open to work" block for the newsletter — pulls
// real talent_pool entries, giving members a reason to add themselves (free
// weekly visibility) instead of the pool being something you have to know
// to go look for. Same graceful-hide-when-empty pattern as the other blocks.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type NewsletterTalent = {
  user_id: string
  headline: string
  full_name: string | null
  title: string | null
  company: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOpenToWorkForNewsletter(adminDb: any, limit = 3): Promise<NewsletterTalent[]> {
  const { data } = await adminDb
    .from('talent_pool')
    .select('user_id, headline, profiles(full_name, title, company)')
    .order('updated_at', { ascending: false })
    .limit(limit)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    headline: row.headline,
    full_name: row.profiles?.full_name ?? null,
    title: row.profiles?.title ?? null,
    company: row.profiles?.company ?? null,
  }))
}

// Returns '' (renders nothing) when nobody's currently in the pool.
export function buildTalentBlock(entries: NewsletterTalent[], origin: string): string {
  if (entries.length === 0) return ''

  const rows = entries.map((t, i) => {
    const isLast = i === entries.length - 1
    const roleLine = [t.title, t.company].filter(Boolean).join(' at ')
    const url = `${origin}/members/${t.user_id}`
    return `
      <tr>
        <td style="padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #eef0f2;'}">
          <a href="${url}" style="font-size:14px;font-weight:700;color:#111827;text-decoration:none;line-height:1.4;">${esc(t.full_name ?? 'A TALK member')}</a>
          ${roleLine ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${esc(roleLine)}</p>` : ''}
          <p style="margin:4px 0 0;font-size:13px;color:#374151;font-style:italic;">&ldquo;${esc(t.headline)}&rdquo;</p>
        </td>
      </tr>`
  }).join('')

  return `
  <tr><td style="background:#ffffff;padding:6px 36px 26px;">
    <div style="border:1px solid #eef0f2;border-radius:12px;padding:20px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">Members open to work</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tbody>${rows}</tbody>
      </table>
      <a href="${origin}/careers" style="display:inline-block;margin-top:14px;font-size:12px;font-weight:700;color:#2563EB;text-decoration:none;">See the full talent pool &rarr;</a>
    </div>
  </td></tr>`
}
