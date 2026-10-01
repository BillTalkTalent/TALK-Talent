import crypto from 'crypto'

// Signs each recipient's unsubscribe link so people can only unsubscribe
// themselves (no new env var — reuses the service-role key as the HMAC secret).
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret'

export function unsubToken(email: string): string {
  return crypto.createHmac('sha256', SECRET).update(email.toLowerCase().trim()).digest('hex').slice(0, 32)
}

export function unsubUrl(origin: string, email: string): string {
  const e = email.toLowerCase().trim()
  return `${origin}/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`
}

// Points straight at the API route (not the confirm page) — this is what
// goes in the List-Unsubscribe header, which a mail client POSTs to
// directly without ever rendering a page.
function unsubApiUrl(origin: string, email: string): string {
  const e = email.toLowerCase().trim()
  return `${origin}/api/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`
}

// RFC 8058 one-click unsubscribe headers — Gmail/Yahoo surface a built-in
// "Unsubscribe" option next to the sender when these are present, and both
// now factor their absence into bulk-mail spam filtering.
export function oneClickUnsubscribeHeaders(origin: string, email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubApiUrl(origin, email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
