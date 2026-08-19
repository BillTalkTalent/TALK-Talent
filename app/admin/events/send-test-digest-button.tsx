'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

export default function SendTestDigestButton({
  sendTest,
}: {
  sendTest: () => Promise<{ ok: boolean; to?: string; error?: string }>
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function onClick() {
    setState('sending')
    const res = await sendTest()
    if (res.ok) {
      setState('sent')
      setMessage(res.to ?? null)
    } else {
      setState('error')
      setMessage(res.error ?? 'Failed to send.')
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button type="button" variant="outline" onClick={onClick} disabled={state === 'sending'}>
        {state === 'sending' ? (
          <><Loader2 className="size-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="size-4" /> Send test digest to me</>
        )}
      </Button>
      {state === 'sent' && (
        <span className="text-sm text-emerald-700">Sent{message ? ` to ${message}` : ''} ✓</span>
      )}
      {state === 'error' && <span className="text-sm text-red-600">{message}</span>}
    </div>
  )
}
