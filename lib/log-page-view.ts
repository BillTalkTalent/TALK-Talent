'use server'

import { createClient } from '@/lib/supabase/server'

// Fire-and-forget route tracking for the "where members are going" view in
// /admin/activity. Never throws — a tracking failure must not break
// navigation. user_id always comes from the authenticated session (RLS
// also enforces auth.uid() = user_id), never from the client-supplied path.
export async function logPageView(path: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('page_views').insert({ user_id: user.id, path })
  } catch {
    // best-effort only
  }
}
