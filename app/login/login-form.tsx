'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

const benefits = [
  'Exclusive TA leader network',
  'Real-time chat & forums',
  'Events, jobs & vendor directory',
]

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkExpired = searchParams.get('error') === 'link_expired'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    window.location.href = '/dashboard'
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden md:flex md:w-2/5 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)' }}
      >
        {/* Logo */}
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
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: '#93C5FD' }} />
              <span className="text-base text-white/90">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/35">
          Membership is reviewed and approved.
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
            <p className="text-xs text-zinc-400 font-medium">The private community for TA leaders.</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-zinc-900">Welcome back</h2>
            <p className="text-sm text-zinc-500">Sign in to your TALK account</p>
          </div>

          {/* Migration notice — every existing member's account moved here */}
          <div className="rounded-xl border px-4 py-3.5" style={{ background: 'rgba(232,80,58,0.06)', borderColor: 'rgba(232,80,58,0.28)' }}>
            <p className="text-sm font-semibold text-[#0F1F35]">👋 Welcome to the new TALK</p>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              Were you a member of the old TALK site?{' '}
              <strong className="text-zinc-800">Your account has moved here — no need to sign up again.</strong>{' '}
              <Link href="/claim" className="font-semibold hover:underline" style={{ color: '#E8503A' }}>
                Claim your account →
              </Link>{' '}
              to set a password. Your profile, chapters, and history came with you.
            </p>
          </div>

          {linkExpired && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Your invite link has expired</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Invite links are only valid for 24 hours. Ask your inviter to send a new one, or{' '}
                  <Link href="/signup" className="underline font-semibold">apply directly</Link>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-[#1E4B82] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* First-time members claim banner */}
          <div className="rounded-xl border px-4 py-3" style={{ background: 'rgba(30,75,130,0.05)', borderColor: 'rgba(30,75,130,0.15)' }}>
            <p className="text-sm text-zinc-700">
              <strong className="text-zinc-900">First time on the new TALK?</strong>{' '}
              If you&apos;re an existing member,{' '}
              <Link href="/claim" className="font-semibold hover:underline" style={{ color: '#1E4B82' }}>
                claim your account
              </Link>{' '}
              to set your password.
            </p>
          </div>

          <p className="text-sm text-zinc-500 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#1E4B82] hover:underline">
              Apply to join
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
