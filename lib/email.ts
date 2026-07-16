/**
 * Shared email template helpers — navy brand, consistent across all notifications.
 */

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'

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

export function buildTestInviteEmail(opts: {
  toFirstName: string
  claimUrl: string
}): string {
  const goals = [
    'Set your password and finish the quick welcome setup (or skip it)',
    'Complete your profile — add a photo, title, and a short bio',
    'Browse the <strong style="color:#0F1F35;">Member Directory</strong> and connect with someone',
    'Read a thread in the <strong style="color:#0F1F35;">Forums</strong> and post a reply',
    'Check out <strong style="color:#0F1F35;">Careers</strong> (jobs + members open to work) and <strong style="color:#0F1F35;">Vendors</strong>',
    'Send a direct message to another member',
  ]
  const list = goals.map(g =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.6;">
       <span style="color:#E8503A;font-weight:800;">&bull;</span>&nbsp;&nbsp;${g}
     </td></tr>`
  ).join('')

  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">We're back — sorry for the hiccup 👋</p>
    <p style="margin:0 0 18px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, a small glitch was stopping people from setting their password earlier today —
      it's now fixed. Here's a fresh link to claim your TALK account and jump in.
    </p>
    ${ctaButton('Claim your account', opts.claimUrl)}
    <p style="margin:26px 0 8px;font-size:13px;font-weight:700;color:#0F1F35;text-transform:uppercase;letter-spacing:0.04em;">
      Once you're in, here's what would help us most
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">${list}</table>
    <p style="margin:18px 0 0;font-size:14px;color:#5A7090;line-height:1.6;">
      Found something confusing or broken? Just hit reply — we read every message.
      Thanks for helping us shape the new TALK.
    </p>
    <p style="margin:14px 0 0;font-size:13px;color:#A0AEC0;line-height:1.6;">
      This link is valid for 24 hours. If you didn't expect it, you can ignore this email.
    </p>
  `)
}

export function buildCheckinEmail(opts: {
  toFirstName: string
  claimUrl: string
}): string {
  const goals = [
    'Finish your profile — add a photo, title, and a short bio',
    'Browse the <strong style="color:#0F1F35;">Member Directory</strong> and connect with someone',
    'Read a thread in the <strong style="color:#0F1F35;">Forums</strong> and post a reply',
    'Take a look at <strong style="color:#0F1F35;">Careers</strong> (jobs + folks open to work) and <strong style="color:#0F1F35;">Vendors</strong>',
    'Send a direct message to another member',
  ]
  const list = goals.map(g =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.6;">
       <span style="color:#E8503A;font-weight:800;">&bull;</span>&nbsp;&nbsp;${g}
     </td></tr>`
  ).join('')

  return emailShell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F1F35;">Quick midweek check-in 👋</p>
    <p style="margin:0 0 14px;font-size:15px;color:#5A7090;line-height:1.6;">
      Hi ${opts.toFirstName}, thanks again for being in the very first group inside the new TALK.
      A quick midweek note — plus an honest word on the login bumps.
    </p>
    <p style="margin:0 0 14px;font-size:15px;color:#5A7090;line-height:1.6;">
      Some of you hit snags getting logged in earlier this week. That was on me — a couple of
      behind-the-scenes issues in sign-in. They're fixed now, and I've confirmed people getting in
      cleanly, including from corporate inboxes.
    </p>
    <p style="margin:0 0 4px;font-size:15px;color:#5A7090;line-height:1.6;">
      If you haven't gotten in yet, your login link is right here — click below, set a password, and
      you're in. It's good for 24 hours; if it expires, just hit reply and I'll send a fresh one.
    </p>
    ${ctaButton('Get into TALK', opts.claimUrl)}
    <p style="margin:26px 0 8px;font-size:13px;font-weight:700;color:#0F1F35;text-transform:uppercase;letter-spacing:0.04em;">
      Once you're in, the things that'd help me most
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">${list}</table>
    <p style="margin:18px 0 0;font-size:14px;color:#5A7090;line-height:1.6;">
      No rush and no pressure — even 10 minutes of poking around is genuinely useful. And if anything
      feels clunky or breaks, just tell me. That's exactly what this phase is for.
    </p>
    <p style="margin:14px 0 0;font-size:15px;color:#5A7090;line-height:1.6;">
      Thank you — truly. Your eyes on this before I open it to the full community make all the difference.
      <br><br>Bill
    </p>
  `)
}

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

// ─── Plain-text counterparts (multipart text/plain improves deliverability) ──

export function buildClaimText(o: { toFirstName: string; claimUrl: string }): string {
  return `Welcome to the new TALK

Hi ${o.toFirstName}, the TALK community has a brand-new home — and your account is ready. Open the link below to set your password and get in. Your profile, posts, and history have all moved with you.

${o.claimUrl}

This link is valid for 24 hours. If you didn't request it, you can safely ignore this email.

— TALK Talent Community`
}

export function buildResetText(o: { toFirstName: string; resetUrl: string }): string {
  return `Reset your password

Hi ${o.toFirstName}, a request was made to reset your TALK password. Open the link below to choose a new one.

${o.resetUrl}

This link is valid for 24 hours. If you didn't request this, you can safely ignore this email.

— TALK Talent Community`
}

export function buildTestInviteText(o: { toFirstName: string; claimUrl: string }): string {
  return `We're back — sorry for the hiccup

Hi ${o.toFirstName}, a small glitch was stopping people from setting their password earlier — it's now fixed. Here's a fresh link to claim your TALK account and jump in.

${o.claimUrl}

Once you're in, here's what would help most:
- Set your password and finish the quick welcome setup
- Complete your profile (photo, title, bio)
- Browse the Member Directory and connect with someone
- Read a thread in the Forums and post a reply
- Check out Careers and Vendors
- Send a direct message to another member

Found something confusing or broken? Just hit reply.

This link is valid for 24 hours.

— Bill`
}

export function buildCheckinText(o: { toFirstName: string; claimUrl: string }): string {
  return `Quick midweek check-in

Hi ${o.toFirstName}, thanks again for being in the very first group inside the new TALK. A quick midweek note — plus an honest word on the login bumps.

Some of you hit snags getting logged in earlier this week. That was on me — a couple of behind-the-scenes issues in sign-in. They're fixed now, and I've confirmed people getting in cleanly, including from corporate inboxes.

If you haven't gotten in yet, your login link is right here — open it, set a password, and you're in. It's good for 24 hours; if it expires, just hit reply and I'll send a fresh one.

${o.claimUrl}

Once you're in, the things that'd help me most:
- Finish your profile (photo, title, short bio)
- Browse the Member Directory and connect with someone
- Read a thread in the Forums and post a reply
- Take a look at Careers (jobs + folks open to work) and Vendors
- Send a direct message to another member

No rush and no pressure — even 10 minutes of poking around is genuinely useful. And if anything feels clunky or breaks, just tell me. That's exactly what this phase is for.

Thank you — truly. Your eyes on this before I open it to the full community make all the difference.

Bill`
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
