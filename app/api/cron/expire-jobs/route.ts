import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// The job board's SELECT policy already hides anything past its expires_at
// at read time (migration 098), so this cron isn't load-bearing for member-
// facing correctness — it's here so `status` itself stays accurate (the
// admin jobs page groups by status, and a poster's own "Reopen listing"
// button reads status too), instead of a listing sitting there forever
// still labeled "active" after it's actually expired.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('job_posts')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closed: data?.length ?? 0 })
}
