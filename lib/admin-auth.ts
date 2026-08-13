import { createClient } from '@/lib/supabase/server'

/**
 * Throws unless the signed-in user is specifically the super admin
 * (profiles.is_superadmin = true) — for the handful of actions reserved for
 * Bill alone: approving/rejecting members, merging duplicate profiles,
 * granting admin access, removing members, and broadcasting to everyone.
 * Returns their user id.
 */
export async function requireSuperAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: me } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (!me?.is_superadmin) throw new Error('Only the super admin can do this')
  return user.id
}
