'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
}

type MemberHit = {
  id: string
  full_name: string | null
  email: string
  company: string | null
  has_onboarded: boolean
}

// Search members by name (admin-only) — for helping people who forget their email.
export async function searchMembersByName(name: string): Promise<MemberHit[]> {
  await requireAdmin()
  const q = (name || '').trim()
  if (q.length < 2) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email, company, has_onboarded')
    .ilike('full_name', `%${q}%`)
    .order('full_name', { ascending: true })
    .limit(15)
  return (data ?? []) as MemberHit[]
}

// Send a claim link to a member's email (reuses the hardened recovery flow).
export async function sendClaimLinkToMember(email: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
  const res = await fetch(`${origin}/api/auth/recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mode: 'claim' }),
  })
  return { ok: res.ok }
}
