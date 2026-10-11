// Standing cross-promotion for Bill's own LinkedIn newsletter — static, not
// admin-editable content, so it shows in every issue going forward without
// anyone having to remember to re-add it each week. Originally a plain gray
// line right before the footer; moved mid-newsletter with real branding
// since the quiet version was easy to scroll straight past.
export const PROMPT_AND_CIRCUMSTANCE_URL =
  "https://www.linkedin.com/newsletters/prompt-circumstance-7486501848514850816/"

export const PROMPT_AND_CIRCUMSTANCE_CALLOUT = `
  <tr><td style="background:#fff;padding:8px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;border:1px solid #E4DBFF;border-radius:14px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#7C3AED;text-transform:uppercase;letter-spacing:0.08em;">From Bill's Desk</p>
        <p style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0F1F35;line-height:1.3;">I also write Prompt and Circumstance</p>
        <p style="margin:0 0 16px;font-size:13px;color:#5A7090;line-height:1.6;">My own weekly take on what's actually shaping talent acquisition — ghost jobs, AI sourcing, and the stuff that doesn't fit in a TALK roundup.</p>
        <a href="${PROMPT_AND_CIRCUMSTANCE_URL}" style="display:inline-block;padding:10px 20px;background:#7C3AED;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px;">Read on LinkedIn &rarr;</a>
      </td></tr>
    </table>
  </td></tr>`
