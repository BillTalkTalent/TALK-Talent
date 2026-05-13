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

export default function LoginPage() {
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
        style={{ background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)' }}
      >
        {/* Logo mark + wordmark */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <svg width="44" height="44" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="9" fill="#00d4aa"/>
              <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
              <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
            </svg>
            <span className="text-4xl font-black tracking-tight text-white">TALK</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4aa]/60">
            Talent Acquisition Leadership Keynotes
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-[#00d4aa]" />
              <span className="text-base text-white/90">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/50">
          Join thousands of TA professionals
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f5fffe] p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <svg width="36" height="36" viewBox="0 0 34 34" fill="none">
                <rect width="34" height="34" rx="9" fill="#00d4aa"/>
                <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white"/>
                <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white"/>
              </svg>
              <span className="text-3xl font-black tracking-tight text-[#2d5a52]">TALK</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5FA8A3]">
              Talent Acquisition Leadership Keynotes
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-zinc-900">Welcome back</h2>
            <p className="text-sm text-zinc-500">Sign in to your TALK account</p>
          </div>

          {linkExpired && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Your invite link has expired</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Invite links are only valid for 24 hours. If you were invited to TALK, ask your inviter to send a new invite, or{' '}
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
                <Link href="/forgot-password" className="text-xs text-[#00b894] hover:underline">
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
              style={{ background: 'linear-gradient(90deg, #00b894, #00d4aa)' }}
              size="lg"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-sm text-zinc-500 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#00b894] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
