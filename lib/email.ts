/**
 * Shared email template helpers — navy brand, consistent across all notifications.
 */

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://talk-talent.vercel.app'

/** Wrap any content block in the standard TALK email shell */
export function emailShell(body: string): string {
  // NOTE: email clients strip CSS gradients — use SOLID colors only.
  // Navy background matches the site; the white "LK" is now visible on navy.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0F1F35;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F35;padding:36px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo on navy (white LK now visible) -->
        <tr><td style="padding:4px 8px 22px;">
          <span style="font-size:26px;font-weight:900;letter-spacing:-0.03em;line-height:1;">
            <span style="color:#E8503A;">TA</span><span style="color:#ffffff;">LK</span>
          </span>
        </td></tr>

        <!-- White content card -->
        <tr><td style="background:#ffffff;padding:36px;border-radius:16px;">
          ${body}
          <hr style="border:none;border-top:1px solid #EDF2F7;margin:28px 0 20px;">
          <p style="margin:0;font-size:12px;color:#A0AEC0;line-height:1.6;">
            You're receiving this from the TALK Talent Community.<br>
            <a href="${ORIGIN}/notifications/settings" style="color:#5A7090;">Manage notifications</a>
          </p>
        </td></tr>

        <!-- Footer on navy -->
        <tr><td style="padding:20px 8px;text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);">
            TALK Talent Community &bull; <a href="${ORIGIN}" style="color:rgba(255,255,255,0.45);">${ORIGIN.replace('https://', '')}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Red CTA button */
export function ctaButton(label: string, href: string): string {
  return `
  <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td style="background:#E8503A;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label} →</a>
    </td></tr>
  </table>`
}

/** Quoted content block (used for message previews) */
export function quoteBlock(text: string): string {
  const safe = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="border-left:3px solid #E8503A;padding:12px 16px;background:#F8FAFC;border-radius:0 8px 8px 0;margin:16px 0;">
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${safe}</p>
  </div>`
}

// ─── Pre-built email payloads ──────────────────────────────────────────────

export function buildDmEmail(opts: {
  toFirstName: string
  fromName: string
  preview: string
  convUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">New message</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, <strong style="color:#0F1F35;">${opts.fromName}</strong> sent you a direct message.
    </p>
    ${quoteBlock(opts.preview)}
    ${ctaButton('Open conversation', opts.convUrl)}
  `)
}

export function buildClaimEmail(opts: {
  toFirstName: string
  claimUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">Welcome to the new TALK 👋</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, the TALK community has a brand-new home — and your account is
      ready. Click below to set your password and get in. Your profile, posts, and history
      have all moved with you.
    </p>
    ${ctaButton('Claim your account', opts.claimUrl)}
    <p style="margin:18px 0 0;font-size:13px;color:#A0AEC0;line-height:1.6;">
      This link is valid for 24 hours. If you didn't request it, you can safely ignore this email.
    </p>
  `)
}

export function buildResetEmail(opts: {
  toFirstName: string
  resetUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">Reset your password</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, we received a request to reset your TALK password.
      Click below to choose a new one.
    </p>
    ${ctaButton('Reset password', opts.resetUrl)}
    <p style="margin:18px 0 0;font-size:13px;color:#A0AEC0;line-height:1.6;">
      This link is valid for 24 hours. If you didn't request this, you can safely ignore this email.
    </p>
  `)
}

export function buildMentorshipRequestEmail(opts: {
  toFirstName: string   // mentor's first name
  requesterName: string
  areaName: string
  message: string
  requestUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">New mentorship request</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, <strong style="color:#0F1F35;">${opts.requesterName}</strong> has requested you as a mentor
      for <strong style="color:#0F1F35;">${opts.areaName}</strong>.
    </p>
    ${quoteBlock(opts.message)}
    ${ctaButton('Review request', opts.requestUrl)}
  `)
}

export function buildMentorshipAcceptedEmail(opts: {
  toFirstName: string   // requester's first name
  mentorName: string
  areaName: string
  requestUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">Your mentorship request was accepted! 🎉</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, great news — <strong style="color:#0F1F35;">${opts.mentorName}</strong> has accepted your mentorship
      request for <strong style="color:#0F1F35;">${opts.areaName}</strong>. Reach out and get started!
    </p>
    ${ctaButton('View your request', opts.requestUrl)}
  `)
}

export function buildMentorshipDeclinedEmail(opts: {
  toFirstName: string
  mentorName: string
  areaName: string
  requestUrl: string
}): string {
  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">Mentorship request update</p>
    <p style="margin:0 0 20px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, <strong style="color:#0F1F35;">${opts.mentorName}</strong> isn't able to take on new mentees
      for <strong style="color:#0F1F35;">${opts.areaName}</strong> right now. You can browse other mentors in the community.
    </p>
    ${ctaButton('Find another mentor', `${ORIGIN}/mentorship`)}
  `)
}
