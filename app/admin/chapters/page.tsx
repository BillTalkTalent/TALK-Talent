import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, Star, X } from 'lucide-react'

async function assignLead(chapterId: string, userId: string) {
  'use server'
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('chapter_leads').upsert({ chapter_id: chapterId, user_id: userId })
  revalidatePath('/admin/chapters')
}

async function removeLead(chapterId: string, userId: string) {
  'use server'
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('chapter_leads').delete().eq('chapter_id', chapterId).eq('user_id', userId)
  revalidatePath('/admin/chapters')
}

export default async function AdminChaptersPage() {
  const supabase = await createClient()

  const [{ data: chapters }, { data: leads }, { data: boardMembers }] = await Promise.all([
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
  ])

  // Build lead map: chapter_id → lead profiles
  const leadMap: Record<string, { user_id: string; full_name: string | null }[]> = {}
  for (const l of leads ?? []) {
    if (!leadMap[l.chapter_id]) leadMap[l.chapter_id] = []
    const profile = l.profiles as { id: string; full_name: string | null } | null
    if (profile) leadMap[l.chapter_id].push({ user_id: l.user_id, full_name: profile.full_name })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicChapters = (chapters ?? []).filter((c: any) => c.type !== 'geographic')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoChapters = (chapters ?? []).filter((c: any) => c.type === 'geographic')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ChapterRow({ chapter }: { chapter: any }) {
    const chapterLeads = leadMap[chapter.id] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unassignedBoardMembers = (boardMembers ?? []).filter(
      (bm: any) => !chapterLeads.some(l => l.user_id === bm.id)
    )

    return (
      <tr className="border-b border-zinc-100 hover:bg-zinc-50/40 transition-colors">
        <td className="py-3 pl-5 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-base">{chapter.icon}</span>
            <span className="font-medium text-sm text-zinc-900">{chapter.name}</span>
          </div>
        </td>
        <td className="py-3 pr-4">
          <div className="flex flex-wrap items-center gap-2">
            {chapterLeads.map(lead => (
              <span key={lead.user_id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {lead.full_name ?? 'Unknown'}
                <form action={removeLead.bind(null, chapter.id, lead.user_id)} className="inline">
                  <button type="submit" className="ml-0.5 text-amber-400 hover:text-red-400 transition-colors">
                    <X className="size-3" />
                  </button>
                </form>
              </span>
            ))}
            {chapterLeads.length === 0 && (
              <span className="text-xs text-zinc-400 italic">No lead assigned</span>
            )}
          </div>
        </td>
        <td className="py-3 pr-5">
          {unassignedBoardMembers.length > 0 && (
            <form action={async (fd: FormData) => {
              'use server'
              const userId = fd.get('userId') as string
              if (userId) await assignLead(chapter.id, userId)
            }}>
              <div className="flex items-center gap-2">
                <select name="userId" className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 bg-white">
                  <option value="">Assign board member…</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {unassignedBoardMembers.map((bm: any) => (
                    <option key={bm.id} value={bm.id}>
                      {bm.full_name}{bm.title ? ` · ${bm.title}` : ''}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">
                  Assign
                </button>
              </div>
            </form>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl flex items-center justify-center bg-amber-500">
          <BookOpen className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Chapter Leads</h1>
          <p className="text-xs text-zinc-500">Assign board members to run each chapter</p>
        </div>
      </div>

      {boardMembers?.length === 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-sm text-amber-700">
          <strong>No board members yet.</strong> Go to the Members tab and change someone&apos;s role to <strong>Board Member</strong> first.
        </div>
      )}

      {/* Topical chapters */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Topical Chapters</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pl-5 pr-4 uppercase tracking-wide">Chapter</th>
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Current Leads</th>
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-5 uppercase tracking-wide">Assign</th>
              </tr>
            </thead>
            <tbody>
              {topicChapters.map((c: any) => <ChapterRow key={c.id} chapter={c} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geographic chapters */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Geographic Chapters</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pl-5 pr-4 uppercase tracking-wide">Chapter</th>
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-4 uppercase tracking-wide">Current Leads</th>
                <th className="text-left text-xs font-semibold text-zinc-400 py-2.5 pr-5 uppercase tracking-wide">Assign</th>
              </tr>
            </thead>
            <tbody>
              {geoChapters.map((c: any) => <ChapterRow key={c.id} chapter={c} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
