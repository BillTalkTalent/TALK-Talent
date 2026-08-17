import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateShareCardPng } from '@/lib/share-card'

// LinkedIn's REST API requires a version header in YYYYMM form. Each
// version is supported for ~2 years from release, then requests to it
// start failing with 426 NONEXISTENT_VERSION — bump this every so often
// (roughly yearly is safe) to a recent YYYYMM.
// https://learn.microsoft.com/en-us/linkedin/marketing/versioning
const LINKEDIN_API_VERSION = '202603'

function linkedinHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

type CardInput = { eyebrow: string; title: string; subtitle?: string | null }

// Renders the branded card for this specific share and uploads it as a
// fresh image asset owned by this member — LinkedIn image assets belong to
// whoever uploads them, so this can't be generated once and reused across
// different members' posts. Returns the image urn, or null if anything
// fails (the post still goes out, just without the branded image).
async function uploadShareCardImage(token: string, memberUrn: string, card: CardInput, richImageUrl?: string): Promise<string | null> {
  try {
    const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: linkedinHeaders(token),
      body: JSON.stringify({
        initializeUploadRequest: { owner: `urn:li:person:${memberUrn}` },
      }),
    })
    if (!initRes.ok) return null
    const initData = await initRes.json()
    const uploadUrl: string | undefined = initData?.value?.uploadUrl
    const imageUrn: string | undefined = initData?.value?.image
    if (!uploadUrl || !imageUrn) return null

    let imageBytes: ArrayBuffer | Buffer
    if (richImageUrl) {
      const richRes = await fetch(richImageUrl)
      imageBytes = richRes.ok ? await richRes.arrayBuffer() : await generateShareCardPng(card)
    } else {
      imageBytes = await generateShareCardPng(card)
    }
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: new Uint8Array(imageBytes),
    })
    if (!putRes.ok) return null

    return imageUrn
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  }

  const { text, card, newsletterId } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'missing_text' }, { status: 400 })
  }
  if (!card || typeof card.title !== 'string' || typeof card.eyebrow !== 'string') {
    return NextResponse.json({ error: 'missing_card' }, { status: 400 })
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

  const richImageUrl = typeof newsletterId === 'string' && newsletterId
    ? `${req.nextUrl.origin}/api/newsletter/${newsletterId}/card`
    : undefined
  const imageUrn = await uploadShareCardImage(connection.access_token, connection.member_urn, card, richImageUrl)

  const linkedinRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: linkedinHeaders(connection.access_token),
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
      ...(imageUrn ? { content: { media: { id: imageUrn, title: card.title } } } : {}),
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
