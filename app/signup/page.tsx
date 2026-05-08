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
  'Exclusive TA leader network',
  'Real-time chat & forums',
  'Events, jobs & vendor directory',
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

    if (error) {
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
              <span className="text-3xl font-black tracking-tight text-[#0d0d0d]">TALK</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5FA8A3]">
              Talent Acquisition Leadership Keynotes
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-[#00d4aa]/30 bg-[#00d4aa]/10 p-8 text-center space-y-3">
              <CheckCircle2 className="size-10 text-[#00b894] mx-auto" />
              <h2 className="text-xl font-semibold text-[#0d0d0d]">Application submitted!</h2>
              <p className="text-sm text-[#00b894]">
                We&apos;ll review your LinkedIn profile and be in touch.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-sm font-semibold text-[#00b894] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-zinc-900">Create your account</h2>
                <p className="text-sm text-zinc-500">Apply to join the TALK community</p>
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
                  {loading ? 'Creating account…' : 'Create Account'}
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
