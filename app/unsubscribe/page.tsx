'use client'

import { useState, use } from 'react'

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>
}) {
  const { e, t } = use(searchParams)
  const email = (e || '').trim()
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  async function confirm() {
    setState('working')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e: email, t }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1F35] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-2xl font-black tracking-tight">
          <span className="text-[#E8503A]">TA</span>
          <span className="text-[#0F1F35]">LK</span>
        </div>

        {state === 'done' ? (
          <>
            <h1 className="text-xl font-bold text-zinc-900">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              {email ? <><strong>{email}</strong> will </> : 'You will '}
              no longer receive community emails from TALK Talent. You can still sign in and manage
              your account any time.
            </p>
          </>
        ) : state === 'error' ? (
          <>
            <h1 className="text-xl font-bold text-zinc-900">That link didn&apos;t work</h1>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              This unsubscribe link is invalid or has expired. If you keep getting emails you don&apos;t
              want, reply to any of them and we&apos;ll take you off the list.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-zinc-900">Unsubscribe from TALK emails?</h1>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              {email ? <><strong>{email}</strong> will </> : 'You will '}
              stop receiving community emails from TALK Talent. This won&apos;t delete your account —
              you can still sign in any time.
            </p>
            <button
              onClick={confirm}
              disabled={state === 'working' || !email || !t}
              className="mt-6 w-full rounded-xl bg-[#E8503A] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {state === 'working' ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
