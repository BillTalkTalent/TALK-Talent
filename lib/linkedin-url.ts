// Loose but real domain check — catches typos and non-LinkedIn URLs (e.g.
// "hrrps://linedin.c9m/in/x") without being so strict it rejects legitimate
// variants (country subdomains like uk.linkedin.com, the lnkd.in shortener,
// trailing slashes). Mirrored in supabase/migrations/068_validate_linkedin_url_format.sql
// as the actual enforcement point — this client-side copy is just for fast
// feedback before that trigger ever runs.
const LINKEDIN_URL_RE = /^https?:\/\/([a-z0-9-]+\.)*(linkedin\.com|lnkd\.in)(\/|$)/i

export function isValidLinkedinUrl(url: string): boolean {
  return LINKEDIN_URL_RE.test(url.trim())
}

export const LINKEDIN_URL_HINT = "That doesn't look like a LinkedIn URL — paste your linkedin.com/in/... profile link."
