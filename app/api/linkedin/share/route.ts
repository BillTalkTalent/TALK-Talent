import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// LinkedIn's REST API requires a version header in YYYYMM form. Each
// version is supported for ~2 years from release, then requests to it
// start failing with 426 NONEXISTENT_VERSION — bump this every so often
// (roughly yearly is safe) to a recent YYYYMM.
// https://learn.microsoft.com/en-us/linkedin/marketing/versioning
const LINKEDIN_API_VERSION = '202603'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  }

  const { text } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'missing_text' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('linkedin_connections')
    .select('access_token, member_urn')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ error: 'not_connected' }, { status: 409 })
  }

  const linkedinRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${connection.member_urn}`,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })

  if (linkedinRes.status === 401) {
    // Token expired or was revoked on LinkedIn's side — clear it so the UI
    // prompts the member to reconnect instead of retrying a dead token.
    await admin.from('linkedin_connections').delete().eq('user_id', user.id)
    return NextResponse.json({ error: 'expired' }, { status: 409 })
  }

  if (!linkedinRes.ok) {
    const detail = await linkedinRes.text()
    return NextResponse.json({ error: 'linkedin_error', detail }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
