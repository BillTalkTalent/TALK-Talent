// The active newsletter sponsor + its email callouts (top masthead + optional
// bottom special-offer block).

export type SponsorPlacement = 'masthead' | 'mid'

export type Sponsor = {
  id: string
  name: string
  logo_url: string | null
  url: string | null
  blurb: string | null
  offer: string | null
  offer_url: string | null
  offer_cta: string | null
  expires_at: string
  placement: SponsorPlacement
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The active sponsor for a given placement: not past its "runs until" date,
// newest wins. 'masthead' and 'mid' each run their own sponsor independently
// — promoting the same vendor in all three ad spots (top, mid, bottom) reads
// as repetitive once there's more than one sponsor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveSponsor(adminDb: any, placement: SponsorPlacement = 'masthead'): Promise<Sponsor | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await adminDb
    .from('newsletter_sponsors')
    .select('*')
    .eq('placement', placement)
    .gte('expires_at', today)
    .order('created_at', { ascending: false })
    .limit(1)
  return (data && data[0]) || null
}

// Top "Presented by" masthead. If the sponsor has an offer, adds a teaser line
// pointing readers to the offer at the bottom.
export function buildSponsorTop(s: Sponsor): string {
  const logo = s.logo_url
    ? `<img src="${s.logo_url}" alt="${esc(s.name)}" style="max-height:46px;max-width:200px;height:auto;display:block;margin:0 auto 10px;">`
    : ''
  const nameLine = `<p style="margin:0;font-size:${logo ? '13' : '17'}px;font-weight:800;color:#111827;">${esc(s.name)}</p>`
  const blurb = s.blurb
    ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${esc(s.blurb)}</p>`
    : ''
  const teaser = s.offer
    ? `<p style="margin:12px 0 0;font-size:12px;font-weight:700;color:#E8503A;">&#127873; Special offer for TALK members below &darr;</p>`
    : (s.url
        ? `<p style="margin:12px 0 0;"><a href="${s.url}" style="display:inline-block;font-size:12px;font-weight:700;color:#0F1F35;text-decoration:none;border-bottom:2px solid #E8503A;padding-bottom:1px;">Learn more &rarr;</a></p>`
        : '')
  return `
  <tr><td style="background:#ffffff;padding:6px 36px 22px;">
    <div style="background:#f9fafb;border:1px solid #eef0f2;border-radius:12px;padding:22px 24px;text-align:center;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;">Presented by</p>
      ${logo}
      ${nameLine}
      ${blurb}
      ${teaser}
    </div>
  </td></tr>`
}

// Compact single-row banner for mid-newsletter, between sections — the "Presented
// by" masthead and the special-offer block are both full-width cards; this is
// meant to feel like a slim aside, not another section.
//
// Unlike buildSponsorTop/buildSponsorBottom, this does NOT return a <tr><td>
// wrapper — it's spliced into compileSectionsToHtml's output (via MID_AD_MARKER
// in app/api/admin/newsletter/route.ts), which lands inside a <td> that's
// already inside a <tr>. A <tr> there would be invalid HTML — nested inside a
// <td> rather than a <table> — and browsers silently "fix" that by hoisting it
// out, which broke the layout of whatever section followed it. This returns a
// plain block (a table of its own, not a table row) so it nests correctly.
export function buildSponsorMid(s: Sponsor): string {
  if (!s.url) return ''
  const logoCell = s.logo_url
    ? `<img src="${s.logo_url}" alt="${esc(s.name)}" style="max-height:22px;max-width:120px;height:auto;display:block;">`
    : `<span style="font-size:13px;font-weight:900;color:#0F1F35;white-space:nowrap;">${esc(s.name)}</span>`
  const message = s.blurb ? esc(s.blurb) : `Check out ${esc(s.name)}`
  // Optional second line — a short member perk ("TALK members get preferred
  // pricing") rather than a full offer card with its own button, so a mid
  // sponsor with a perk still reads as one compact banner, not another
  // full-width card like the masthead's special-offer callout.
  const perkLine = s.offer
    ? `<p style="margin:5px 0 0;font-size:12px;line-height:1.4;">
         <span style="color:#F07058;font-weight:800;">&#9733;</span>
         <span style="color:#ffffff;font-weight:700;">${esc(s.offer)}</span>
       </p>`
    : ''
  return `
    <a href="${s.url}" target="_blank" style="text-decoration:none;display:block;margin-bottom:36px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="background:#0F1F35;border-radius:14px;">
        <tr>
          <td style="padding:18px 20px;" valign="middle">
            <table cellpadding="0" cellspacing="0"><tr>
              <td valign="top" style="padding-right:16px;padding-top:2px;">
                <div style="background:#ffffff;border-radius:6px;padding:6px 10px;white-space:nowrap;">${logoCell}</div>
              </td>
              <td valign="middle">
                <p style="margin:0;font-size:14px;line-height:1.4;">
                  <span style="color:rgba(255,255,255,0.55);font-weight:700;">Sponsored &mdash;</span>
                  <span style="color:#ffffff;font-weight:700;">${message}</span>
                </p>
                ${perkLine}
              </td>
            </tr></table>
          </td>
          <td style="padding:18px 22px 18px 0;white-space:nowrap;" valign="middle" align="right">
            <span style="font-size:13px;font-weight:800;color:#F07058;">Learn more &rarr;</span>
          </td>
        </tr>
      </table>
    </a>`
}

// Bottom special-offer callout — only rendered when the sponsor has an offer.
export function buildSponsorBottom(s: Sponsor): string {
  if (!s.offer) return ''
  const href = s.offer_url || s.url || ''
  const cta = (s.offer_cta && s.offer_cta.trim()) || 'Claim offer'
  const button = href
    ? `<tr><td align="center" style="padding-top:16px;"><a href="${href}" style="display:inline-block;background:#E8503A;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:11px 26px;border-radius:10px;">${esc(cta)} &rarr;</a></td></tr>`
    : ''
  return `
  <tr><td style="background:#ffffff;padding:8px 36px 26px;">
    <div style="background:#0F1F35;border-radius:14px;padding:26px 26px 22px;text-align:center;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#F07058;">Special offer &middot; ${esc(s.name)}</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;line-height:1.5;">${esc(s.offer)}</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tbody>${button}</tbody></table>
    </div>
  </td></tr>`
}
