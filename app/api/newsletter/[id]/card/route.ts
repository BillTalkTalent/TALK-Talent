import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateNewsletterCardPng } from '@/lib/share-card'
import { getNewsletterStats } from '@/lib/newsletter-stats'

// Newsletter-specific LinkedIn share card — real "this week in TALK"
// numbers baked into the image rather than a plain title floating in
// empty space. Public (no auth) since it just needs to render for a
// scheduled or sent edition, same reach as the /newsletter/[id] teaser
// page this image links people back to.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any

  const { data: newsletter } = await adminDb
    .from('newsletters')
    .select('subject, preview_text, status')
    .eq('id', id)
    .single()

  if (!newsletter || (newsletter.status !== 'sent' && newsletter.status !== 'scheduled')) {
    return new Response('Not found', { status: 404 })
  }

  const stats = await getNewsletterStats(adminDb)
  const png = await generateNewsletterCardPng({
    title: newsletter.subject || 'TALK Newsletter',
    subtitle: newsletter.preview_text,
    stats,
  })

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
  })
}
