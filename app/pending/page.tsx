'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Clock, LogOut, ExternalLink } from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'

export default function PendingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-[#00d4aa]/30 border-t-[#00d4aa] animate-spin" />
          <p className="text-white/40 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  const isRejected = profile?.status === 'rejected'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <svg width="40" height="40" viewBox="0 0 34 34" fill="none">
          <rect width="34" height="34" rx="9" fill="#00d4aa" />
          <rect x="8" y="12" width="18" height="3" rx="1.5" fill="white" />
          <rect x="8" y="18.5" width="13" height="3" rx="1.5" fill="white" />
        </svg>
        <span className="text-3xl font-black tracking-tight text-white">TALK</span>
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
            <div className="size-16 rounded-2xl bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center mx-auto">
              <Clock className="size-8 text-[#00d4aa]" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">
                {profile?.full_name ? `Hi ${profile.full_name.split(' ')[0]}, you're in the queue!` : 'Application received!'}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4aa]/15 border border-[#00d4aa]/25">
                <span className="size-1.5 rounded-full bg-[#00d4aa] animate-pulse shrink-0" />
                <span className="text-sm font-bold text-[#00d4aa]">We&apos;ll review and approve within 24 hours</span>
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

            {/* What to expect */}
            <div className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2.5 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">What happens next</p>
              {[
                'We review your LinkedIn profile and work history',
                'You get an email with a one-click login link when approved',
                'Access to the full TALK community immediately',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#00d4aa]/20 text-[9px] font-black text-[#00d4aa]">
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
