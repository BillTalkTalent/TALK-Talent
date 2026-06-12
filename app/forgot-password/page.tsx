'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowLeft } from 'lucide-react'

const benefits = [
  '13,000+ TA leaders across North America',
  'Forums, events, jobs & vendor reviews',
  'Private, invite-only community',
]

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Send the reset email through Resend (server route generates the recovery
    // link and emails it — no Supabase rate limit, branded template).
    await fetch('/api/auth/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, mode: 'reset' }),
    }).catch(() => {})
    // Always show success — don't leak whether email exists
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
            The private community for TA leaders.
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
          We&apos;ll get you back into your account.
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

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-zinc-900">Reset your password</h2>
            <p className="text-sm text-zinc-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center space-y-3">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-emerald-800">Check your inbox</p>
              <p className="text-sm text-emerald-700">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a
                password reset link shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
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
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
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
