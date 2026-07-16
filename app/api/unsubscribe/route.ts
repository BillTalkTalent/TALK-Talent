import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unsubToken } from '@/lib/unsubscribe'

// POST { e, t } — verifies the signed token, then adds the address to the
// suppression list. POST-only on purpose: corporate email scanners prefetch
// links with GET, and we don't want them silently unsubscribing members.
export async function POST(req: NextRequest) {
  try {
    const { e, t } = (await req.json()) as { e?: string; t?: string }
    const email = (e || '').toLowerCase().trim()
    if (!email || !t) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (t !== unsubToken(email)) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await admin
      .from('email_unsubscribes')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

    return NextResponse.json({ ok: true, email })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
