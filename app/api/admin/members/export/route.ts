import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// CSV export of the member search on app/admin/members — same per-word
// AND'd search as that page (see 77dc912's fix for why: a single-phrase
// substring match missed anyone whose name has a middle initial, suffix,
// etc. between the words searched), so what you export always matches what
// you were just looking at on screen.
function csvField(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Paginated — an unpaginated .select() silently caps at 1000 rows against
  // 12,800+ members (the same bug class fixed on the dashboard's poll
  // counts and the demographics page), which would quietly truncate an
  // export with no error.
  const pageSize = 1000
  const rows: Record<string, unknown>[] = []
  for (let page = 0; page < 200; page++) {
    let query = db
      .from('profiles')
      .select('full_name, email, company, title, industry, company_size, ta_level, linkedin_url, created_at')
      .eq('status', 'approved')
      .eq('is_bot', false)
      .order('id', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    if (q) {
      const words = q.replace(/[,()*]/g, ' ').trim().split(/\s+/).filter(Boolean)
      for (const word of words) {
        const like = `%${word}%`
        query = query.or(`full_name.ilike.${like},email.ilike.${like},company.ilike.${like},title.ilike.${like}`)
      }
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
  }

  const header = ['Full Name', 'Email', 'Company', 'Title', 'Industry', 'Company Size', 'TA Level', 'LinkedIn URL', 'Joined']
  const lines = [header.map(csvField).join(',')]
  for (const r of rows) {
    lines.push([
      r.full_name, r.email, r.company, r.title, r.industry, r.company_size, r.ta_level, r.linkedin_url, r.created_at,
    ].map(csvField).join(','))
  }

  const filename = `talk-members${q ? `-${q.replace(/[^a-z0-9]+/gi, '-')}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
