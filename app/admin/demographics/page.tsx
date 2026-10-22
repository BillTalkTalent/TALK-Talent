import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, MapPin, Compass, GraduationCap, Briefcase, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import ChapterFilter from './chapter-filter'

// Same "PostgREST caps an unpaginated select at 1000 rows" lesson learned
// the hard way on the dashboard's poll vote counts (app/(app)/dashboard) —
// with 12,800+ approved members, a plain .select() here would silently
// undercount every breakdown below. Page through with .range() instead,
// same pattern as app/admin/activity/page.tsx's listAllProfiles.
async function listAll<T>(
  table: string,
  select: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any,
): Promise<T[]> {
  const pageSize = 1000
  const all: T[] = []
  for (let page = 0; page < 200; page++) {
    const from = page * pageSize
    let query = admin.from(table).select(select).order('id', { ascending: true }).range(from, from + pageSize - 1)
    if (filter) query = filter(query)
    const { data, error } = await query
    if (error) throw new Error(`listAll(${table}) page ${page} failed: ${error.message}`)
    const rows: T[] = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
  }
  return all
}

const TA_LEVEL_LABELS: Record<string, string> = {
  coordinator: 'Coordinator',
  generalist: 'Generalist',
  practitioner: 'Practitioner',
  manager: 'Manager',
  senior_leadership: 'Senior Leadership',
}

const COMPANY_SIZE_LABELS: Record<string, string> = {
  self_employed: 'Self-employed',
  '1_10': '1–10',
  '11_50': '11–50',
  '51_200': '51–200',
  '201_500': '201–500',
  '501_1000': '501–1,000',
  '1001_5000': '1,001–5,000',
  '5001_10000': '5,001–10,000',
  '10001_plus': '10,001+',
}

type Profile = {
  id: string
  full_name: string | null
  email: string
  company: string | null
  title: string | null
  industry: string | null
  company_size: string | null
  ta_level: string | null
}
type ChapterMembership = { user_id: string; chapter_id: string }
type Chapter = { id: string; name: string; type: 'geographic' | 'topic' }
type TalentPoolRow = { user_id: string }

function groupCounts(values: (string | null)[], labels?: Record<string, string>): { label: string; count: number }[] {
  const filled = values.filter((v): v is string => !!v)
  const counts = new Map<string, number>()
  for (const v of filled) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()]
    .map(([key, count]) => ({ label: labels?.[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
}

function BreakdownCard({
  icon: Icon, title, caption, rows, barColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  caption: string
  rows: { label: string; count: number }[]
  barColor: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-zinc-400">{caption}</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">No data yet.</p>
        ) : rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-600 w-36 shrink-0 truncate" title={r.label}>{r.label}</span>
            <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: barColor }} />
            </div>
            <span className="text-xs font-bold text-zinc-700 w-10 text-right">{r.count.toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const MEMBERS_PAGE_SIZE = 50

export default async function AdminDemographicsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; page?: string }>
}) {
  const sp = await searchParams
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const [profiles, chapterMemberships, { data: chapters }, talentPool] = await Promise.all([
    listAll<Profile>('profiles', 'id, full_name, email, company, title, industry, company_size, ta_level', db, (q) => q.eq('status', 'approved').eq('is_bot', false)),
    listAll<ChapterMembership>('chapter_memberships', 'user_id, chapter_id', db),
    db.from('chapters').select('id, name, type'),
    listAll<TalentPoolRow>('talent_pool', 'user_id', db),
  ])

  const approvedIds = new Set(profiles.map((p) => p.id))
  const chapterById = new Map<string, Chapter>((chapters ?? []).map((c: Chapter) => [c.id, c]))
  const selectedChapter = sp.chapter ? chapterById.get(sp.chapter) ?? null : null

  // Scope everything below to the selected chapter's members, or to every
  // approved member when nothing's selected — the two breakdown functions
  // and the member list all read from this one set, so "All members" and
  // "just this chapter" go through identical logic.
  const scopedIds = selectedChapter
    ? new Set(chapterMemberships.filter((m) => m.chapter_id === selectedChapter.id && approvedIds.has(m.user_id)).map((m) => m.user_id))
    : approvedIds
  const scopedProfiles = profiles.filter((p) => scopedIds.has(p.id))
  const totalMembers = scopedProfiles.length

  const openToWorkIds = new Set(talentPool.map((t) => t.user_id))

  function chapterBreakdown(type: 'geographic' | 'topic') {
    const membersByChapterName = new Map<string, Set<string>>()
    for (const m of chapterMemberships) {
      if (!scopedIds.has(m.user_id)) continue
      const chapter = chapterById.get(m.chapter_id)
      if (!chapter || chapter.type !== type) continue
      if (!membersByChapterName.has(chapter.name)) membersByChapterName.set(chapter.name, new Set())
      membersByChapterName.get(chapter.name)!.add(m.user_id)
    }
    return [...membersByChapterName.entries()]
      .map(([label, members]) => ({ label, count: members.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }

  const industryRows = groupCounts(scopedProfiles.map((p) => p.industry))
  const companySizeRows = groupCounts(scopedProfiles.map((p) => p.company_size), COMPANY_SIZE_LABELS)
  const taLevelRows = groupCounts(scopedProfiles.map((p) => p.ta_level), TA_LEVEL_LABELS)
  const geoRows = chapterBreakdown('geographic')
  const topicRows = chapterBreakdown('topic')

  const industryFilled = scopedProfiles.filter((p) => p.industry).length
  const companySizeFilled = scopedProfiles.filter((p) => p.company_size).length
  const taLevelFilled = scopedProfiles.filter((p) => p.ta_level).length
  const membersInAnyChapter = new Set(chapterMemberships.filter((m) => scopedIds.has(m.user_id)).map((m) => m.user_id)).size
  const openToWorkCount = scopedProfiles.filter((p) => openToWorkIds.has(p.id)).length

  const pct = (n: number) => totalMembers === 0 ? '0%' : `${Math.round((n / totalMembers) * 100)}%`

  // The member list is sliced from the already-fully-loaded scopedProfiles
  // array (no second round trip) — sorted alphabetically since that's the
  // most useful order for scanning a list this long.
  const sortedMembers = [...scopedProfiles].sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email))
  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / MEMBERS_PAGE_SIZE))
  const safePage = Math.min(pageNum, totalPages)
  const pageMembers = sortedMembers.slice((safePage - 1) * MEMBERS_PAGE_SIZE, safePage * MEMBERS_PAGE_SIZE)
  const chapterQuery = selectedChapter ? `chapter=${selectedChapter.id}` : ''
  const pageHref = (p: number) => `/admin/demographics?${[chapterQuery, `page=${p}`].filter(Boolean).join('&')}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Demographics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Who the {totalMembers.toLocaleString()} {selectedChapter ? `${selectedChapter.name} members` : 'approved members'} actually
            are — for segmenting marketing and messaging, not for tracking engagement (see Activity for that).
          </p>
        </div>
        <ChapterFilter chapters={chapters ?? []} selectedId={selectedChapter?.id ?? ''} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <Users className="size-4 mb-2 text-zinc-400" />
            <p className="text-xl font-black text-zinc-900 leading-none">{totalMembers.toLocaleString()}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1.5">{selectedChapter ? 'Members in this chapter' : 'Approved members'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MapPin className="size-4 mb-2 text-zinc-400" />
            <p className="text-xl font-black text-zinc-900 leading-none">{membersInAnyChapter.toLocaleString()}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1.5">In a chapter</p>
            <p className="text-[11px] text-zinc-400">{pct(membersInAnyChapter)} of this group</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Briefcase className="size-4 mb-2 text-zinc-400" />
            <p className="text-xl font-black text-zinc-900 leading-none">{openToWorkCount.toLocaleString()}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1.5">Open to work</p>
            <p className="text-[11px] text-zinc-400">{pct(openToWorkCount)} of this group</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <GraduationCap className="size-4 mb-2 text-zinc-400" />
            <p className="text-xl font-black text-zinc-900 leading-none">{pct(taLevelFilled)}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1.5">Have a TA level set</p>
            <p className="text-[11px] text-zinc-400">Low fill rate — read that chart as directional only</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard
          icon={Building2}
          title="Industry"
          caption={`${industryFilled.toLocaleString()} of ${totalMembers.toLocaleString()} (${pct(industryFilled)}) have this set`}
          rows={industryRows}
          barColor="#E8503A"
        />
        <BreakdownCard
          icon={Users}
          title="Company Size"
          caption={`${companySizeFilled.toLocaleString()} of ${totalMembers.toLocaleString()} (${pct(companySizeFilled)}) have this set`}
          rows={companySizeRows}
          barColor="#3b82f6"
        />
        <BreakdownCard
          icon={GraduationCap}
          title="Leadership Level"
          caption={`${taLevelFilled.toLocaleString()} of ${totalMembers.toLocaleString()} (${pct(taLevelFilled)}) have this set`}
          rows={taLevelRows}
          barColor="#f59e0b"
        />
        <BreakdownCard
          icon={MapPin}
          title="Geographic Chapter"
          caption={selectedChapter?.type === 'geographic' ? 'Everyone here is in this chapter by definition' : 'Top 12 by member count — a member can belong to more than one'}
          rows={geoRows}
          barColor="#15803d"
        />
        <BreakdownCard
          icon={Compass}
          title="Topic Chapter"
          caption={selectedChapter?.type === 'topic' ? 'Everyone here is in this chapter by definition' : 'What members say they care about — top 12 by member count'}
          rows={topicRows}
          barColor="#8b5cf6"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Users className="size-4" />
            Members
          </CardTitle>
          <p className="text-xs text-zinc-400">
            {totalMembers.toLocaleString()} {selectedChapter ? `in ${selectedChapter.name}` : 'approved members'} · showing page {safePage} of {totalPages}
          </p>
          {/* Exports every member currently in scope (the whole chapter,
              not just this page of 50) — same scopedProfiles the charts
              above are built from. */}
          <CardAction>
            <a
              href={`/api/admin/demographics/export${chapterQuery ? `?${chapterQuery}` : ''}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Download className="size-3.5" />
              Download CSV
            </a>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                <th className="py-2.5 pr-4 pl-4 font-semibold">Name</th>
                <th className="py-2.5 pr-4 font-semibold">Company / Title</th>
                <th className="py-2.5 pr-4 font-semibold">Industry</th>
                <th className="py-2.5 pr-4 font-semibold">Company Size</th>
                <th className="py-2.5 pr-4 font-semibold">TA Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {pageMembers.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/50">
                  <td className="py-3 pr-4 pl-4">
                    <Link href={`/admin/members?q=${encodeURIComponent(m.email)}`} className="font-medium text-zinc-700 hover:underline">
                      {m.full_name ?? m.email}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{[m.title, m.company].filter(Boolean).join(' at ') || '—'}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{m.industry ?? '—'}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{m.company_size ? (COMPANY_SIZE_LABELS[m.company_size] ?? m.company_size) : '—'}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{m.ta_level ? (TA_LEVEL_LABELS[m.ta_level] ?? m.ta_level) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">Page {safePage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                {safePage > 1 ? (
                  <Link href={pageHref(safePage - 1)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
                    <ChevronLeft className="size-4" /> Prev
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300"><ChevronLeft className="size-4" /> Prev</span>
                )}
                {safePage < totalPages ? (
                  <Link href={pageHref(safePage + 1)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
                    Next <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300">Next <ChevronRight className="size-4" /></span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
