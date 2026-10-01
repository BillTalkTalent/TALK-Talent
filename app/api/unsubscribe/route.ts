import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unsubToken } from '@/lib/unsubscribe'

// Verifies the signed token, then adds the address to the suppression list.
// POST-only on purpose: corporate email scanners prefetch links with GET,
// and we don't want them silently unsubscribing members.
//
// Two callers hit this: our own confirm page, which POSTs {e, t} as JSON,
// and mail clients doing RFC 8058 one-click unsubscribe (Gmail/Yahoo "unsub"
// button) — those POST a fixed `List-Unsubscribe=One-Click` body with no
// knowledge of our JSON shape, so e/t have to come from the URL's query
// string instead, which is where the List-Unsubscribe header points them.
export async function POST(req: NextRequest) {
  try {
    let e: string | undefined
    let t: string | undefined
    try {
      const body = (await req.json()) as { e?: string; t?: string }
      e = body.e
      t = body.t
    } catch {
      /* not JSON — a one-click client's form-encoded body, fall through to query params */
    }
    e ??= req.nextUrl.searchParams.get('e') ?? undefined
    t ??= req.nextUrl.searchParams.get('t') ?? undefined
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
