import { NextRequest, NextResponse } from 'next/server'
import { sendRecoveryLink, type RecoveryMode } from '@/lib/send-recovery-link'

export async function POST(req: NextRequest) {
  try {
    const { email, mode = 'claim' } = (await req.json()) as { email?: string; mode?: RecoveryMode }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
    const result = await sendRecoveryLink(email, mode, origin)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/recovery]', err)
    // Still return ok to avoid leaking membership / breaking the UX
    return NextResponse.json({ ok: true })
  }
}
