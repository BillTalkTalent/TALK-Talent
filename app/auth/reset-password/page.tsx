'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isClaim = searchParams.get('claim') === '1'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the access token in the URL hash when redirecting here
    // We need to wait for the session to be picked up from the hash
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ background: '#F5F8FC' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-semibold text-zinc-900">
            {isClaim ? "You're all set! 🎉" : 'Password updated!'}
          </h2>
          <p className="text-sm text-zinc-500">
            {isClaim ? 'Welcome to TALK. Taking you in…' : 'Taking you to your dashboard…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8" style={{ background: '#F5F8FC' }}>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <span style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.03em', display: 'inline-flex', alignItems: 'baseline' }}>
            <span style={{ color: '#E8503A' }}>TA</span>
            <span style={{ color: '#0F1F35' }}>LK</span>
          </span>
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-semibold text-zinc-900">
            {isClaim ? 'Set your password' : 'Choose a new password'}
          </h2>
          <p className="text-sm text-zinc-500">
            {isClaim ? 'One step to access your TALK account. At least 8 characters.' : 'Must be at least 8 characters.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            className="w-full text-white font-semibold"
            style={{ background: '#E8503A' }}
            size="lg"
            disabled={loading || !ready}
          >
            {loading ? 'Saving…' : !ready ? 'Verifying link…' : isClaim ? 'Set password & enter' : 'Set new password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
