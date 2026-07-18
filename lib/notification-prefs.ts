// Helpers for respecting notification_preferences before notifying/emailing.
// Missing rows or null values default to ON, so opting out is always explicit.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any
type PrefRow = Record<string, boolean | null>

export async function loadPrefs(adminDb: AdminDb, userIds: string[]): Promise<Map<string, PrefRow>> {
  const map = new Map<string, PrefRow>()
  if (userIds.length === 0) return map
  const { data } = await adminDb.from('notification_preferences').select('*').in('user_id', userIds)
  for (const p of data || []) map.set(p.user_id, p)
  return map
}

/** True unless the user has explicitly turned this preference off. */
export function wants(prefs: Map<string, PrefRow>, userId: string, key: string, dflt = true): boolean {
  const row = prefs.get(userId)
  if (!row) return dflt
  const v = row[key]
  return v === null || v === undefined ? dflt : !!v
}
