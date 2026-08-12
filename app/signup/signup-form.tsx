'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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

type MatchCandidate = {
  id: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  title: string | null
}

export default function SignupForm() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const eventTitle = searchParams.get('title')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[] | null>(null)

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/signup/find-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, linkedinUrl }),
      })
      const { candidates } = await res.json()
      if (candidates?.length > 0) {
        setMatchCandidates(candidates)
        setLoading(false)
        return
      }
    } catch {
      // Matching is a nice-to-have — if it fails, fall through to a normal signup.
    }

    await completeSignup(null)
  }

  async function completeSignup(claimedMatchId: string | null) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any).from('profiles').upsert({
        id: user.id,
        email,
        full_name: fullName,
        linkedin_url: linkedinUrl,
        status: 'pending' as const,
        role: 'member' as const,
        interested_event_id: eventId || null,
        claimed_match_id: claimedMatchId,
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
          Membership is always free for the TA community.
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

          {success ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="size-14 rounded-2xl bg-[#1E4B82]/10 border border-[#1E4B82]/25 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-8 text-[#1E4B82]" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Application submitted!</h2>
                <p className="text-sm text-zinc-500">
                  You&apos;re on your way to joining TALK.
                </p>
              </div>

              {/* 24-hour promise — prominent */}
              <div className="rounded-xl bg-[#1E4B82]/08 border border-[#1E4B82]/20 px-4 py-3 flex items-center gap-3">
                <span className="text-xl shrink-0">⏱</span>
                <p className="text-sm font-semibold text-[#1E4B82]">
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
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#1E4B82]/15 text-[9px] font-black text-[#1E4B82]">{n}</span>
                    <p className="text-xs text-zinc-500 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-400 text-center">
                Check your spam folder if you don&apos;t see our email. Questions?{' '}
                <a href="mailto:hello@talktalent.com" className="text-[#1E4B82] hover:underline font-semibold">hello@talktalent.com</a>
              </p>
            </div>
          ) : matchCandidates ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Is this you?</h2>
                <p className="text-sm text-zinc-500">
                  We found existing TALK profile{matchCandidates.length > 1 ? 's' : ''} that might
                  already be yours.
                </p>
              </div>

              <div className="space-y-2.5">
                {matchCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={loading}
                    onClick={() => completeSignup(c.id)}
                    className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left hover:border-[#1E4B82] hover:bg-[#1E4B82]/03 transition-colors disabled:opacity-60"
                  >
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" className="size-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="size-10 rounded-full bg-zinc-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{c.full_name ?? 'TALK Member'}</p>
                      {(c.title || c.company) && (
                        <p className="text-xs text-zinc-500 truncate">
                          {[c.title, c.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => completeSignup(null)}
                className="w-full text-center text-sm text-zinc-500 hover:underline py-2 disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'None of these are me — create a new profile'}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Apply for membership</h2>
                <p className="text-sm text-zinc-500">Join the TALK community for TA leaders</p>
              </div>

              {eventTitle && (
                <div className="rounded-xl bg-[#E8503A]/06 border border-[#E8503A]/20 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    🎉 Excited you want to join us for &ldquo;{eventTitle}&rdquo;! Apply below and
                    we&apos;ll get you set up for the event.
                  </p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5">
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
                  style={{ background: '#E8503A' }}
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Apply for Membership'}
                </Button>
              </form>

              <p className="text-sm text-zinc-500 text-center">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#1E4B82] hover:underline">
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
