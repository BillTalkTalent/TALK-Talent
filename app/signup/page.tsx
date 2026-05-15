'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

const benefits = [
  'Curated network of TA leaders',
  'Forums, events & job board',
  'Invite-only — membership is reviewed',
]

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    // A confirmation-email error doesn't mean the account wasn't created —
    // treat it as a soft failure and continue if we have a user.
    const isEmailError = error?.message?.toLowerCase().includes('email') ||
                         error?.message?.toLowerCase().includes('sending')
    if (error && (!isEmailError || !data.user)) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email,
        full_name: fullName,
        linkedin_url: linkedinUrl,
        status: 'pending' as const,
        role: 'member' as const,
      })

      if (profileError) {
        toast.error('Failed to save profile. Please try again.')
        setLoading(false)
        return
      }
    }

    // Fire-and-forget admin notification
    if (user) {
      fetch('/api/notify-admin-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})
    }

    setSuccess(true)
    setLoading(false)
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
                <linearGradient id="signup-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9B5CFF"/>
                  <stop offset="100%" stopColor="#6F2CFF"/>
                </linearGradient>
              </defs>
              <g transform="translate(110 95)">
                <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#signup-grad)"/>
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
              <CheckCircle2 className="size-5 shrink-0 text-[#00d4aa]" />
              <span className="text-base text-white/90">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/35">
          Membership is free during our launch period.
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
                    <linearGradient id="signup-mob-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9B5CFF"/>
                      <stop offset="100%" stopColor="#6F2CFF"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(110 95)">
                    <path d="M218 62 H342 C402 62 444 105 444 165 V221 C444 281 402 324 342 324 H272 L335 380 L256 324 H218 C158 324 116 281 116 221 V165 C116 105 158 62 218 62Z" fill="none" stroke="#FFFFFF" strokeWidth="24" strokeLinejoin="round"/>
                    <path d="M248 178 H352 C375 178 392 195 392 218 V240 C392 267 371 288 344 288 H250 C222 288 202 267 202 240 V224 C202 197 221 178 248 178Z" fill="url(#signup-mob-grad)"/>
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

          {success ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="size-14 rounded-2xl bg-[#00d4aa]/15 border border-[#00d4aa]/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8 text-[#00b894]" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Application submitted!</h2>
                <p className="text-sm text-zinc-500">
                  You&apos;re on your way to joining TALK.
                </p>
              </div>

              {/* 24-hour promise — prominent */}
              <div className="rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/25 px-4 py-3 flex items-center gap-3">
                <span className="text-xl shrink-0">⏱</span>
                <p className="text-sm font-semibold text-[#007a60]">
                  We review every application within <span className="underline decoration-dotted">24 hours</span> — you&apos;ll hear from us by email.
                </p>
              </div>

              {/* What happens next */}
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">What happens next</p>
                {[
                  { n: '1', text: 'We review your LinkedIn profile and background' },
                  { n: '2', text: 'You receive an approval email with a one-click login link' },
                  { n: '3', text: 'Full access to the TALK community, immediately' },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#00d4aa]/20 text-[9px] font-black text-[#00b894]">{n}</span>
                    <p className="text-xs text-zinc-500 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-400 text-center">
                Check your spam folder if you don&apos;t see our email. Questions?{' '}
                <a href="mailto:hello@talktalent.com" className="text-[#00b894] hover:underline font-semibold">hello@talktalent.com</a>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Apply for membership</h2>
                <p className="text-sm text-zinc-500">Join the TALK community for TA leaders</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/yourname"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
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
                  {loading ? 'Submitting…' : 'Apply for Membership'}
                </Button>
              </form>

              <p className="text-sm text-zinc-500 text-center">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#00b894] hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
