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
  const [mode, setMode] = useState<'password' | 'magic-link'>('magic-link')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [linkedinLoading, setLinkedinLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    if (mode === 'magic-link') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      setMagicLinkSent(true)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.refresh()
    window.location.href = '/dashboard'
  }

  async function handleLinkedInSignIn() {
    setLinkedinLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      toast.error(error.message)
      setLinkedinLoading(false)
    }
    // On success, Supabase redirects to LinkedIn — no further action here.
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

          <Button
            type="button"
            variant="outline"
            className="w-full font-semibold gap-2.5"
            size="lg"
            onClick={handleLinkedInSignIn}
            disabled={linkedinLoading}
          >
            <svg viewBox="0 0 24 24" className="size-4.5 shrink-0" fill="#0A66C2" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452z" />
            </svg>
            {linkedinLoading ? 'Redirecting…' : 'Continue with LinkedIn'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {magicLinkSent ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-zinc-900">Check your email</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                We sent a sign-in link to <strong>{email}</strong>. Click it to log straight in — no password needed.
              </p>
            </div>
          ) : (
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
              {mode === 'password' && (
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
              )}

              <Button
                type="submit"
                className="w-full text-white font-semibold"
                style={{ background: '#E8503A' }}
                size="lg"
                disabled={loading}
              >
                {loading
                  ? (mode === 'magic-link' ? 'Sending…' : 'Signing in…')
                  : (mode === 'magic-link' ? 'Send me a sign-in link' : 'Sign In')}
              </Button>

              <button
                type="button"
                onClick={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
                className="w-full text-center text-xs text-zinc-500 hover:underline"
              >
                {mode === 'password' ? 'Sign in with a magic link instead' : 'Sign in with your password instead'}
              </button>
            </form>
          )}

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
