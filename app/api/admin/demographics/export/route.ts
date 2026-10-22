import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CSV export of the member list on app/admin/demographics — scoped to the
// same chapter filter that page's dropdown uses, so what you export always
// matches what you were just looking at on screen.
function csvField(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listAll<T>(table: string, select: string, db: any, filter?: (q: any) => any): Promise<T[]> {
  const pageSize = 1000
  const all: T[] = []
  for (let page = 0; page < 200; page++) {
    const from = page * pageSize
    let query = db.from(table).select(select).order('id', { ascending: true }).range(from, from + pageSize - 1)
    if (filter) query = filter(query)
    const { data, error } = await query
    if (error) throw new Error(`listAll(${table}) page ${page} failed: ${error.message}`)
    const rows: T[] = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
  }
  return all
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const chapterId = req.nextUrl.searchParams.get('chapter') ?? ''

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  try {
    type Profile = { id: string; full_name: string | null; email: string; company: string | null; title: string | null; industry: string | null; company_size: string | null; ta_level: string | null }
    type ChapterMembership = { user_id: string; chapter_id: string }

    const [profiles, chapter] = await Promise.all([
      listAll<Profile>('profiles', 'id, full_name, email, company, title, industry, company_size, ta_level', db, (q) => q.eq('status', 'approved').eq('is_bot', false)),
      chapterId ? db.from('chapters').select('id, name').eq('id', chapterId).single().then((r: { data: { id: string; name: string } | null }) => r.data) : Promise.resolve(null),
    ])

    let scopedProfiles = profiles
    if (chapterId && chapter) {
      const memberships = await listAll<ChapterMembership>('chapter_memberships', 'user_id, chapter_id', db, (q) => q.eq('chapter_id', chapterId))
      const scopedIds = new Set(memberships.map((m) => m.user_id))
      scopedProfiles = profiles.filter((p) => scopedIds.has(p.id))
    }

    const header = ['Full Name', 'Email', 'Company', 'Title', 'Industry', 'Company Size', 'TA Level']
    const lines = [header.map(csvField).join(',')]
    for (const p of scopedProfiles) {
      lines.push([p.full_name, p.email, p.company, p.title, p.industry, p.company_size, p.ta_level].map(csvField).join(','))
    }

    const scopeName = chapter ? chapter.name.replace(/[^a-z0-9]+/gi, '-') : 'all-members'
    const filename = `talk-demographics-${scopeName}-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 })
  }
}
