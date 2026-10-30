'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function MagicLinkPage() {
  return (
    <Suspense fallback={null}>
      <MagicLinkInner />
    </Suspense>
  )
}

function MagicLinkInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // IMPORTANT: verifyOtp runs only on this click, never on page load — a
  // security scanner that fetches this page without running JS (or without
  // a human clicking) can't burn the token. See lib/magic-link.ts.
  async function handleContinue() {
    const tokenHash = searchParams.get('token_hash')
    const redirectTo = searchParams.get('redirect_to') ?? '/dashboard'

    if (!tokenHash) {
      router.push(redirectTo)
      return
    }

    setLoading(true)
    const supabase = createClient()
    // Must match whatever Supabase actually issued the token as — a
    // brand-new auth user gets a "signup"-type token even when the sender
    // requested "magiclink" (see lib/magic-link.ts), and verifying with the
    // wrong type fails even seconds after generation.
    const otpType = (searchParams.get('type') ?? 'magiclink') as
      | 'magiclink' | 'signup' | 'recovery' | 'invite' | 'email'
    const { error: verifyError } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
    if (verifyError) {
      setError('This link has expired or already been used. Ask for a fresh one and you’ll be right in.')
      setLoading(false)
      return
    }
    router.push(redirectTo)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8" style={{ background: '#F5F8FC' }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        <span
          style={{
            fontFamily: 'var(--font-poppins), system-ui',
            fontWeight: 900,
            fontSize: '1.9rem',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            display: 'inline-flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <span style={{ color: '#E8503A' }}>TA</span>
          <span style={{ color: '#0F1F35' }}>LK</span>
        </span>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">You&apos;re almost in</h1>
          <p className="text-sm text-zinc-500">One click and you&apos;re signed in.</p>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <Button
            onClick={handleContinue}
            disabled={loading}
            className="w-full text-white font-semibold gap-1.5"
            style={{ background: '#E8503A' }}
            size="lg"
          >
            {loading ? 'Signing you in…' : (
              <>
                Continue to TALK <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
