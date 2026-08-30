import type { createAdminClient } from '@/lib/supabase/admin'

function extractLinkedInSlug(url: string): string | null {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return m ? m[1].toLowerCase() : null
}

const SAFE_FIELDS = 'id, full_name, avatar_url, company, title, linkedin_url'

export type MatchCandidate = {
  id: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  title: string | null
  linkedin_url: string | null
}

type AdminClient = ReturnType<typeof createAdminClient>

// Shared by the signup form's pre-signup "is this you?" check
// (app/api/signup/find-matches) and the OAuth callback's post-signup dedup
// (app/auth/callback/route.ts) — both need the same "does an existing,
// non-rejected profile look like this person" logic, just triggered at
// different points since OAuth accounts get created before we ever see a
// name to compare.
export async function findMatchCandidates(
  admin: AdminClient,
  { fullName, linkedinUrl, excludeId }: { fullName?: string | null; linkedinUrl?: string | null; excludeId?: string }
): Promise<MatchCandidate[]> {
  const slug = typeof linkedinUrl === 'string' && linkedinUrl.trim() ? extractLinkedInSlug(linkedinUrl) : null
  // Collapse repeated/leading/trailing whitespace so a paste artifact like
  // "Bethany  Burpee " doesn't dodge the exact-name match below.
  const name = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queries: any[] = []
  if (slug) {
    let q = admin.from('profiles').select(SAFE_FIELDS).neq('status', 'rejected').ilike('linkedin_url', `%${slug}%`).limit(5)
    if (excludeId) q = q.neq('id', excludeId)
    queries.push(q)
  }
  if (name) {
    let q = admin.from('profiles').select(SAFE_FIELDS).neq('status', 'rejected').ilike('full_name', name).limit(5)
    if (excludeId) q = q.neq('id', excludeId)
    queries.push(q)
  }

  if (queries.length === 0) return []

  const results = await Promise.all(queries)
  const seen = new Map<string, MatchCandidate>()
  for (const { data } of results) {
    for (const row of (data ?? []) as MatchCandidate[]) {
      seen.set(row.id, row)
    }
  }

  return Array.from(seen.values()).slice(0, 5)
}
