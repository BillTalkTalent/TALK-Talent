'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

const benefits = [
  '13,000+ TA leaders across North America',
  'Forums, events, jobs & vendor reviews',
  'Your profile and history carried over',
]

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isClaim = searchParams.get('claim') === '1'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // Preferred path: admin-generated links (claim/reset) carry a one-time
    // token_hash. Verifying it here establishes the session WITHOUT needing a
    // PKCE code_verifier — so it works on any device/browser the recipient
    // opens the email on. (The old hash/implicit assumption silently failed
    // under the client's default PKCE flow, stranding users on "Verifying link…".)
    const tokenHash = searchParams.get('token_hash')
    const otpType = (searchParams.get('type') ?? 'recovery') as
      | 'recovery' | 'invite' | 'magiclink' | 'email' | 'signup'

    if (tokenHash) {
      supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash }).then(({ error }) => {
        if (cancelled) return
        if (error) {
          setLinkError('This link has expired or already been used. Ask for a fresh one and you’ll be right in.')
        } else {
          setReady(true)
        }
      })
      return () => { cancelled = true }
    }

    // Fallback: a session already exists, or an implicit/hash-style link.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    let tries = 0
    const poll = setInterval(async () => {
      tries++
      const { data } = await supabase.auth.getSession()
      if (data.session) { setReady(true); clearInterval(poll) }
      if (tries >= 12) {
        clearInterval(poll)
        if (!cancelled) setLinkError(prev => prev ?? 'We couldn’t verify this link. Ask for a fresh one and try again.')
      }
    }, 500)

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      clearInterval(poll)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden md:flex md:w-2/5 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)' }}
      >
        <div className="flex flex-col gap-3">
          <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '2.75rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
            <span style={{ color: '#E8503A' }}>TA</span>
            <span style={{ color: 'white' }}>LK</span>
          </span>
          <p className="text-sm text-white/50 font-medium">
            {isClaim ? 'The new home for the TALK community.' : 'The private community for TA leaders.'}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: '#93C5FD' }} />
              <span className="text-base text-white/90">{b}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/35">
          {isClaim ? 'Already a TALK member? Your account is waiting.' : 'Secure password reset for your TALK account.'}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8" style={{ background: '#F5F8FC' }}>
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center">
            <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
              <span style={{ color: '#E8503A' }}>TA</span>
              <span style={{ color: '#0F1F35' }}>LK</span>
            </span>
          </div>

          {done ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-semibold text-zinc-900">
                {isClaim ? "You're all set! 🎉" : 'Password updated!'}
              </h2>
              <p className="text-sm text-zinc-500">
                {isClaim ? 'Welcome to TALK. Taking you in…' : 'Taking you to your dashboard…'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">
                  {isClaim ? 'Set your password' : 'Choose a new password'}
                </h2>
                <p className="text-sm text-zinc-500">
                  {isClaim ? 'One step to access your TALK account. At least 8 characters.' : 'Must be at least 8 characters.'}
                </p>
              </div>

              {linkError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {linkError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white font-semibold"
                  style={{ background: '#E8503A' }}
                  size="lg"
                  disabled={loading || !ready || !!linkError}
                >
                  {loading ? 'Saving…' : linkError ? 'Link expired' : !ready ? 'Verifying link…' : isClaim ? 'Set password & enter' : 'Set new password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
