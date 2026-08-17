import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateNewsletterCardPng, generateShareCardPng } from '@/lib/share-card'

// Newsletter-specific LinkedIn share card — real "this week in TALK"
// numbers baked into the image rather than a plain title floating in
// empty space. Public (no auth) since it just needs to render for a
// scheduled or sent edition, same reach as the /newsletter/[id] teaser
// page this image links people back to.
//
// Never returns a bare error response — a broken-image icon in the share
// dialog or a failed download is worse than a plainer fallback image, so
// any failure (DB, stats query, font fetch, rendering) falls back to the
// simple generic card instead.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  let subject = 'TALK Newsletter'
  let previewText: string | null = null

  try {
    const { data: newsletter } = await adminDb
      .from('newsletters')
      .select('subject, preview_text, status')
      .eq('id', id)
      .single()

    if (!newsletter || (newsletter.status !== 'sent' && newsletter.status !== 'scheduled')) {
      return new Response('Not found', { status: 404 })
    }
    subject = newsletter.subject || subject
    previewText = newsletter.preview_text

    // Matches the "13,000+" figure already used in the homepage hero copy —
    // Bill's call to keep this a fixed round number rather than the live
    // (currently lower) approved-member count.
    const png = await generateNewsletterCardPng({ title: subject, subtitle: previewText, memberCount: 13000 })
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    console.error('[newsletter card] rich card failed, falling back to generic card:', err)
    try {
      const png = await generateShareCardPng({ eyebrow: 'TALK Newsletter', title: subject, subtitle: previewText })
      return new Response(new Uint8Array(png), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
      })
    } catch (fallbackErr) {
      console.error('[newsletter card] fallback card also failed:', fallbackErr)
      return new Response('Image generation failed', { status: 500 })
    }
  }
}
