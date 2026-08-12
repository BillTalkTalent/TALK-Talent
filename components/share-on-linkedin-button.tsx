'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  )
}

export function ShareOnLinkedInButton({ defaultText }: { defaultText: string }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(defaultText)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/linkedin/status')
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false))
  }, [])

  async function connectLinkedIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        scopes: 'openid profile email w_member_social',
        redirectTo: `${window.location.origin}/auth/callback?linkedin_connect=1&next=${encodeURIComponent(window.location.pathname)}`,
      },
    })
  }

  async function handleShare() {
    setLoading(true)
    try {
      const res = await fetch('/api/linkedin/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success('Posted to LinkedIn')
        setOpen(false)
        return
      }

      if (data.error === 'not_connected' || data.error === 'expired') {
        setConnected(false)
        toast.error(
          data.error === 'expired'
            ? 'Your LinkedIn connection expired — reconnect to share'
            : 'Connect LinkedIn to share'
        )
        return
      }

      toast.error('Failed to post to LinkedIn. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="gap-2 text-white" style={{ background: '#0A66C2' }} />
        }
      >
        <LinkedInIcon />
        Share on LinkedIn
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share on LinkedIn</DialogTitle>
        </DialogHeader>

        {connected === false ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your LinkedIn account to post directly to your feed.
            </p>
            <Button
              type="button"
              onClick={connectLinkedIn}
              className="gap-2 text-white"
              style={{ background: '#0A66C2' }}
            >
              <LinkedInIcon />
              Connect LinkedIn
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Say something about this…"
            />
            <DialogFooter>
              <Button type="button" onClick={handleShare} disabled={loading || !text.trim()}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Post to LinkedIn'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
