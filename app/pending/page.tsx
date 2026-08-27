'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, LogOut, ExternalLink, Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'
import { isValidLinkedinUrl, LINKEDIN_URL_HINT } from '@/lib/linkedin-url'

export default function PendingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullNameInput, setFullNameInput] = useState('')
  const [linkedinInput, setLinkedinInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      // If they've been approved, send them in
      if (data?.status === 'approved') {
        router.replace('/dashboard')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Members who signed up via "Continue with LinkedIn" land here with no
  // linkedin_url on file at all — LinkedIn's OAuth data doesn't expose a
  // profile URL, so there's no way to auto-fill it. Without this, they'd
  // sit here indefinitely: the DB blocks approval without one, and nothing
  // ever prompted them to provide it.
  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    const trimmedName = fullNameInput.trim()
    const trimmedLinkedin = linkedinInput.trim()
    if (needsName && !trimmedName) {
      toast.error('Please enter your full name.')
      return
    }
    if (needsLinkedin) {
      if (!trimmedLinkedin) {
        toast.error('Please paste your LinkedIn URL.')
        return
      }
      if (!isValidLinkedinUrl(trimmedLinkedin)) {
        toast.error(LINKEDIN_URL_HINT)
        return
      }
    }

    setSaving(true)
    const supabase = createClient()
    const updates: { full_name?: string; linkedin_url?: string } = {}
    if (needsName) updates.full_name = trimmedName
    if (needsLinkedin) updates.linkedin_url = trimmedLinkedin

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    setSaving(false)
    if (error) {
      toast.error('Failed to save — please try again.')
      return
    }
    setProfile({ ...profile, ...updates })
    toast.success('Thanks — your application is complete.')
  }

  const needsName = !profile?.full_name?.trim()
  const needsLinkedin = !profile?.linkedin_url?.trim()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0F1F35 0%, #162D4A 100%)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-[#93C5FD]/30 border-t-[#93C5FD] animate-spin" />
          <p className="text-white/40 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  const isRejected = profile?.status === 'rejected'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)' }}
    >
      {/* Logo */}
      <div className="mb-12">
        <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '2.25rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
          <span style={{ color: '#E8503A' }}>TA</span>
          <span style={{ color: 'white' }}>LK</span>
        </span>
      </div>

      <div className="w-full max-w-md">
        {isRejected ? (
          /* Rejected state */
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-5">
            <div className="size-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
              <span className="text-2xl">✕</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Application not approved</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Unfortunately we weren&apos;t able to offer you membership at this time.
                TALK is a curated community — this decision isn&apos;t a reflection of your
                experience or abilities.
              </p>
              {profile?.rejection_note && profile.rejection_note !== 'Does not meet community criteria' && (
                <p className="text-white/40 text-xs italic mt-2">
                  Note: {profile.rejection_note}
                </p>
              )}
            </div>
            <p className="text-white/40 text-xs">
              If you believe this was an error, reply to the email we sent you.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-white/60 border-white/20 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        ) : (
          /* Pending state */
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center space-y-6">
            {/* Animated clock icon */}
            <div className="size-16 rounded-2xl bg-[#93C5FD]/10 border border-[#93C5FD]/20 flex items-center justify-center mx-auto">
              <Clock className="size-8 text-[#93C5FD]" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">
                {profile?.full_name ? `Hi ${profile.full_name.split(' ')[0]}, you're in the queue!` : 'Application received!'}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#93C5FD]/15 border border-[#93C5FD]/25">
                <span className="size-1.5 rounded-full bg-[#93C5FD] animate-pulse shrink-0" />
                <span className="text-sm font-bold text-[#93C5FD]">We&apos;ll review and approve within 24 hours</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                You&apos;ll receive an email with a one-click login link as soon as you&apos;re approved.
                Check your spam folder just in case.
              </p>
            </div>

            {/* LinkedIn URL */}
            {profile?.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all group"
              >
                <ExternalLink className="size-4 text-[#0077B5] shrink-0" />
                <span className="truncate">{profile.linkedin_url.replace('https://www.linkedin.com/in/', '')}</span>
              </a>
            )}

            {/* Signed up via "Continue with LinkedIn" — that doesn't give us a
                profile URL or always a name, and we can't review (or approve)
                an application without one. Ask for it here instead of leaving
                them stuck with no idea why nothing's happening. */}
            {(needsName || needsLinkedin) && (
              <form onSubmit={handleCompleteProfile} className="space-y-3 text-left">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-200">One more thing before we can review you</p>
                  <p className="text-xs text-amber-200/70 mt-1">
                    {needsName && needsLinkedin
                      ? "We're missing your name and LinkedIn profile — we can't review an application without them."
                      : needsName
                      ? "We're missing your name."
                      : "We're missing your LinkedIn profile — we can't review an application without it."}
                  </p>
                </div>
                {needsName && (
                  <Input
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Full name"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  />
                )}
                {needsLinkedin && (
                  <Input
                    value={linkedinInput}
                    onChange={(e) => setLinkedinInput(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  />
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full text-white font-semibold"
                  style={{ background: '#E8503A' }}
                >
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : 'Complete my application'}
                </Button>
              </form>
            )}

            {/* What to expect */}
            <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2.5 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">What happens next</p>
              {[
                'We review your LinkedIn profile and work history',
                'You get an email with a one-click login link when approved',
                'Access to the full TALK community immediately',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#93C5FD]/20 text-[9px] font-black text-[#93C5FD]">
                    {i + 1}
                  </span>
                  <p className="text-xs text-white/50 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-white/40 hover:text-white/70 hover:bg-white/10"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
