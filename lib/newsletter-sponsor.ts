// The active newsletter sponsor + its email callout band.

export type Sponsor = {
  id: string
  name: string
  logo_url: string | null
  url: string | null
  blurb: string | null
  position: 'top' | 'bottom'
  expires_at: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The one active sponsor: not past its "runs until" date, newest wins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveSponsor(adminDb: any): Promise<Sponsor | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await adminDb
    .from('newsletter_sponsors')
    .select('*')
    .gte('expires_at', today)
    .order('created_at', { ascending: false })
    .limit(1)
  return (data && data[0]) || null
}

// A "PRESENTED BY" band as a table row that slots into the newsletter email.
export function buildSponsorBand(s: Sponsor): string {
  const logo = s.logo_url
    ? `<img src="${s.logo_url}" alt="${esc(s.name)}" style="max-height:46px;max-width:200px;height:auto;display:block;margin:0 auto 10px;">`
    : ''
  const nameLine = `<p style="margin:0;font-size:${logo ? '13' : '17'}px;font-weight:800;color:#111827;">${esc(s.name)}</p>`
  const blurb = s.blurb
    ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${esc(s.blurb)}</p>`
    : ''
  const cta = s.url
    ? `<p style="margin:12px 0 0;"><a href="${s.url}" style="display:inline-block;font-size:12px;font-weight:700;color:#0F1F35;text-decoration:none;border-bottom:2px solid #E8503A;padding-bottom:1px;">Learn more &rarr;</a></p>`
    : ''
  return `
  <tr><td style="background:#ffffff;padding:6px 36px 22px;">
    <div style="background:#f9fafb;border:1px solid #eef0f2;border-radius:12px;padding:22px 24px;text-align:center;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">Presented by</p>
      ${logo}
      ${nameLine}
      ${blurb}
      ${cta}
    </div>
  </td></tr>`
}
