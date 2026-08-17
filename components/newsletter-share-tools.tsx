'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Copy, Check, Download, Loader2 } from 'lucide-react'

// For posting to the TALK LinkedIn Company Page — LinkedIn's API requires
// org-level Marketing Developer Platform access to post as a page (a much
// higher approval bar than the personal w_member_social scope used
// elsewhere), so that's not automatable here. This gives the two pieces
// needed to post it manually instead: the public link and the branded
// share-card image.
export function NewsletterShareTools({
  publicUrl,
  card,
}: {
  publicUrl: string
  card: { eyebrow: string; title: string; subtitle?: string | null }
}) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const previewParams = new URLSearchParams({ eyebrow: card.eyebrow, title: card.title })
  if (card.subtitle) previewParams.set('subtitle', card.subtitle)
  const imageUrl = `/api/linkedin/card-preview?${previewParams.toString()}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link — copy it manually: ' + publicUrl)
    }
  }

  async function downloadImage() {
    setDownloading(true)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `talk-newsletter-${card.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download image')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadImage} disabled={downloading} className="gap-1.5">
        {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        Download image
      </Button>
    </div>
  )
}
