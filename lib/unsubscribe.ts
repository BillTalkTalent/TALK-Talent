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
