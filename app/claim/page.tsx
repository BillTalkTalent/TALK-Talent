'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowLeft, Mail } from 'lucide-react'

const benefits = [
  '13,000+ TA leaders across North America',
  'Forums, events, jobs & vendor reviews',
  'Your profile and history carried over',
]

export default function ClaimAccountPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    // Members were imported with confirmed emails but no password.
    // A recovery link lets them set a password and land logged-in.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password?claim=1`,
    })
    // Always show success — never reveal whether an email is registered
    setSent(true)
    setLoading(false)
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
            The new home for the TALK community.
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
          Already a TALK member? Your account is waiting.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8" style={{ background: '#F5F8FC' }}>
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center gap-2">
            <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
              <span style={{ color: '#E8503A' }}>TA</span>
              <span style={{ color: '#0F1F35' }}>LK</span>
            </span>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="size-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(30,75,130,0.1)', border: '1px solid rgba(30,75,130,0.25)' }}>
                  <Mail className="size-7" style={{ color: '#1E4B82' }} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Check your inbox</h2>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(30,75,130,0.06)', border: '1px solid rgba(30,75,130,0.18)' }}>
                <p className="text-sm text-zinc-700 leading-relaxed">
                  If{' '}<strong className="text-zinc-900">{email}</strong>{' '}is a TALK member, we&apos;ve sent a secure link to set your password and access your account.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-white p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">What to do next</p>
                {[
                  'Open the email from TALK',
                  'Click the secure link to set your password',
                  'You&apos;re in — explore the new platform',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: '#1E4B82' }}>{i + 1}</span>
                    <p className="text-xs text-zinc-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: t }} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 text-center">
                Didn&apos;t get it? Check spam, or{' '}
                <button onClick={() => setSent(false)} className="font-semibold hover:underline" style={{ color: '#1E4B82' }}>try a different email</button>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Claim your account</h2>
                <p className="text-sm text-zinc-500">
                  Welcome to the new TALK. Enter the email from your membership and we&apos;ll send you a secure link to get in.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Your membership email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full text-white font-semibold"
                  style={{ background: '#E8503A' }}
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'Send my access link'}
                </Button>
              </form>

              <p className="text-sm text-zinc-500 text-center">
                Already set up?{' '}
                <Link href="/login" className="font-semibold hover:underline" style={{ color: '#1E4B82' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
