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
  newsletterId,
  downloadName,
}: {
  publicUrl: string
  newsletterId: string
  downloadName?: string
}) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const imageUrl = `/api/newsletter/${newsletterId}/card`

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
      a.download = downloadName ?? `talk-newsletter-${newsletterId}.png`
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
