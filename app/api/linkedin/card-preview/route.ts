import { NextRequest } from 'next/server'
import { generateShareCardPng } from '@/lib/share-card'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eyebrow = searchParams.get('eyebrow') ?? 'TALK'
  const title = searchParams.get('title') ?? 'TALK Community'
  const subtitle = searchParams.get('subtitle')

  const png = await generateShareCardPng({ eyebrow, title, subtitle })

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  })
}
