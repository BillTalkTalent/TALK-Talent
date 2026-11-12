import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import ChapterManager from './chapter-manager'

export default async function AdminChaptersPage() {
  const supabase = await createClient()

  const [{ data: chapters }, { data: leads }, { data: boardMembers }, { data: memberCounts }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('chapters').select('*').order('sort_order'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('chapter_leads')
      .select('chapter_id, user_id, profiles(id, full_name, avatar_url)'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('profiles')
      .select('id, full_name, title, company')
      .in('role', ['board_member', 'admin'])
      .eq('status', 'approved')
      .order('full_name'),
    // Same real GROUP BY aggregate the member-facing /chapters list uses
    // (migration 075) — fetching every membership row and counting
    // client-side would silently undercount past PostgREST's 1000-row cap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('chapter_member_counts'),
  ])

  // Build lead map: chapter_id → lead profiles
  const leadMap: Record<string, { user_id: string; full_name: string | null }[]> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leads ?? []) as any[]) {
    if (!leadMap[l.chapter_id]) leadMap[l.chapter_id] = []
    const profile = l.profiles as { id: string; full_name: string | null } | null
    if (profile) leadMap[l.chapter_id].push({ user_id: l.user_id, full_name: profile.full_name })
  }

  const memberCountMap: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (memberCounts ?? []) as any[]) {
    memberCountMap[row.chapter_id] = Number(row.member_count)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl flex items-center justify-center bg-amber-500">
          <BookOpen className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Chapters</h1>
          <p className="text-xs text-zinc-500">Search, edit, staff, and retire TALK&apos;s chapters</p>
        </div>
      </div>

      <ChapterManager
        chapters={chapters ?? []}
        leadMap={leadMap}
        memberCountMap={memberCountMap}
        boardMembers={boardMembers ?? []}
      />
    </div>
  )
}
