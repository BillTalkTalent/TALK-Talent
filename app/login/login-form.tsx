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
        style={{ background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)' }}
      >
        {/* Logo */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="46" style={{ width: 'auto' }} aria-hidden="true">
              <defs>
                <linearGradient id="login-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9B5CFF"/>
                  <stop offset="100%" stopColor="#6F2CFF"/>
                </linearGradient>
              </defs>
              <g transform="translate(110 95)">
                <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#login-grad)"/>
                <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#FFFFFF"/>
                <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
                <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000000" opacity="0.92"/>
              </g>
            </svg>
            <span className="font-black text-white tracking-tight" style={{ fontSize: '2.75rem', letterSpacing: '-0.02em' }}>
              T<span className="relative inline-block">
                A
                <span className="absolute rounded-full" style={{ width: 8, height: 8, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 4, left: '50%', transform: 'translateX(-50%)' }} />
              </span>LK
            </span>
          </div>
          <p className="text-sm text-white/50 font-medium">
            The private community for TA leaders.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-[#F07058]" />
              <span className="text-base text-white/90">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/35">
          Membership is reviewed and approved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f5fffe] p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="size-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #0d0d0d, #1a1a2e)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 554 475" height="22" style={{ width: 'auto' }} aria-hidden="true">
                  <defs>
                    <linearGradient id="login-mob-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9B5CFF"/>
                      <stop offset="100%" stopColor="#6F2CFF"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(110 95)">
                    <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                    <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#login-mob-grad)"/>
                    <path d="M50 0 H268 C330 0 374 44 374 106 V175 C374 237 330 281 268 281 H206 L206 333 C206 346 191 353 181 344 L113 281 H50 C20 281 0 261 0 231 V50 C0 20 20 0 50 0Z" fill="#FFFFFF"/>
                    <rect x="126" y="78" width="208" height="38" rx="19" fill="#000000" opacity="0.92"/>
                    <path d="M126 154 H270 C282 154 292 164 292 176 C292 188 282 198 270 198 H225 V281 C225 293 215 303 203 303 C191 303 181 293 181 281 V198 H126 C114 198 104 188 104 176 C104 164 114 154 126 154Z" fill="#000000" opacity="0.92"/>
                  </g>
                </svg>
              </div>
              <span className="font-black text-[#0d0d0d] tracking-tight" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
                T<span className="relative inline-block">
                  A
                  <span className="absolute rounded-full" style={{ width: 6, height: 6, background: 'linear-gradient(135deg,#9B5CFF,#6F2CFF)', bottom: 2, left: '50%', transform: 'translateX(-50%)' }} />
                </span>LK
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">The private community for TA leaders.</p>
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
                <Link href="/forgot-password" className="text-xs text-[#E8503A] hover:underline">
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
              style={{ background: 'linear-gradient(90deg, #E8503A, #F07058)' }}
              size="lg"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-sm text-zinc-500 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#E8503A] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
