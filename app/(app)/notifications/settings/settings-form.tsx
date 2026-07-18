'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Prefs {
  email_forum_topics: boolean
  email_forum_replies: boolean
  email_poll_comments: boolean
  email_events: boolean
  email_digest: boolean
  email_chapter_announcements: boolean
  push_forum_topics: boolean
  push_forum_replies: boolean
  push_poll_comments: boolean
  push_poll_votes: boolean
  push_events: boolean
}

const DEFAULTS: Prefs = {
  email_forum_topics: true,
  email_forum_replies: true,
  email_poll_comments: true,
  email_events: true,
  email_digest: false,
  email_chapter_announcements: true,
  push_forum_topics: true,
  push_forum_replies: true,
  push_poll_comments: true,
  push_poll_votes: true,
  push_events: true,
}

const ROWS: { key: keyof Prefs; label: string; section: 'email' | 'push' }[] = [
  { key: 'email_forum_topics', label: 'New forum topics', section: 'email' },
  { key: 'email_forum_replies', label: 'Replies to your topics', section: 'email' },
  { key: 'email_poll_comments', label: 'Comments on your polls', section: 'email' },
  { key: 'email_events', label: 'Upcoming events', section: 'email' },
  { key: 'email_chapter_announcements', label: 'Chapter announcements', section: 'email' },
  { key: 'email_digest', label: 'Weekly digest', section: 'email' },
  { key: 'push_forum_topics', label: 'New forum topics', section: 'push' },
  { key: 'push_forum_replies', label: 'Replies to your topics', section: 'push' },
  { key: 'push_poll_comments', label: 'Comments on your polls', section: 'push' },
  { key: 'push_poll_votes', label: 'Votes on your polls', section: 'push' },
  { key: 'push_events', label: 'Upcoming events', section: 'push' },
]

export default function SettingsForm({ userId, initialPrefs }: { userId: string; initialPrefs: Partial<Prefs> | null }) {
  const supabase = createClient()
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULTS, ...(initialPrefs ?? {}) })
  const [saving, setSaving] = useState(false)

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notification_preferences')
      .upsert({ user_id: userId, ...next }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      toast.error('Failed to save preference')
      setPrefs(prefs)
    } else {
      toast.success('Saved')
    }
  }

  return (
    <div className="space-y-6">
      {(['email', 'push'] as const).map((section) => (
        <div key={section} className="rounded-2xl bg-white border border-zinc-100 shadow-sm">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              {section === 'email' ? 'Email Notifications' : 'Push Notifications'}
            </h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {ROWS.filter(r => r.section === section).map((row) => (
              <div key={row.key} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-zinc-700">{row.label}</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[row.key]}
                    onChange={() => toggle(row.key)}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:bg-[#1E4B82] transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
