'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'

const STORAGE_KEY = 'talk_getting_started_dismissed'

interface ChecklistItem {
  key: string
  label: string
  desc: string
  href: string
  done: boolean
}

interface Props {
  items: ChecklistItem[]
}

export default function GettingStartedCard({ items }: Props) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [collapsed, setCollapsed] = useState(false)

  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === items.length
  const pct = Math.round((doneCount / items.length) * 100)

  // Read persisted dismissal on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      setDismissed(true)
    } else if (allDone) {
      // Auto-dismiss and persist once everything is complete
      localStorage.setItem(STORAGE_KEY, 'true')
      setDismissed(true)
    } else {
      setDismissed(false)
    }
  }, [allDone])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-100">
        {/* Progress ring */}
        <div className="relative size-10 shrink-0">
          <svg className="size-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#F07058" strokeWidth="3"
              strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-zinc-700">
            {doneCount}/{items.length}
          </span>
        </div>

        <div className="flex-1">
          <p className="font-bold text-sm text-zinc-900">
            {allDone ? '🎉 You\'re all set!' : 'Get started with TALK'}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {allDone
              ? 'You\'ve completed all the getting started steps.'
              : `${items.length - doneCount} step${items.length - doneCount === 1 ? '' : 's'} left to get the most out of TALK`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            onClick={dismiss}
            className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Checklist */}
      {!collapsed && (
        <div className="divide-y divide-zinc-50">
          {items.map(item => (
            <Link
              key={item.key}
              href={item.done ? '#' : item.href}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                item.done ? 'opacity-50 cursor-default' : 'hover:bg-zinc-50 group'
              }`}
            >
              <div className="shrink-0">
                {item.done
                  ? <CheckCircle2 className="size-5 text-[#F07058]" />
                  : <Circle className="size-5 text-zinc-200 group-hover:text-zinc-300 transition-colors" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.done ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-zinc-400 truncate">{item.desc}</p>
              </div>
              {!item.done && (
                <span className="text-xs font-semibold text-[#E8503A] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  Do this →
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
