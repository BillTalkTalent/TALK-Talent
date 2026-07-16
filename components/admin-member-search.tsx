'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Send, Check, Loader2 } from 'lucide-react'
import { searchMembersByName, sendClaimLinkToMember } from '@/app/admin/member-actions'

type MemberHit = {
  id: string
  full_name: string | null
  email: string
  company: string | null
  has_onboarded: boolean
}

export default function AdminMemberSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MemberHit[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})

  async function doSearch(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim().length < 2) return
    setLoading(true)
    try {
      setResults(await searchMembersByName(q))
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  async function send(email: string) {
    setSent((s) => ({ ...s, [email]: 'sending' }))
    const { ok } = await sendClaimLinkToMember(email)
    setSent((s) => ({ ...s, [email]: ok ? 'sent' : 'error' }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find a member &amp; send their claim link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500 -mt-1">
          For members who can&apos;t remember which email they used. Search by name, then send
          their claim link to the address on file.
        </p>
        <form onSubmit={doSearch} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className="max-w-xs"
          />
          <Button type="submit" disabled={loading || q.trim().length < 2}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </Button>
        </form>

        {searched && results.length === 0 && (
          <p className="text-sm text-zinc-500">No members found for &ldquo;{q}&rdquo;.</p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {results.map((m) => {
              const state = sent[m.email]
              return (
                <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">
                      {m.full_name || '(no name)'}
                      {m.has_onboarded && (
                        <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                          already claimed
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">
                      {m.email}{m.company ? ` · ${m.company}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={state === 'sent' ? 'outline' : 'default'}
                    disabled={state === 'sending' || state === 'sent'}
                    onClick={() => send(m.email)}
                  >
                    {state === 'sending' ? (
                      <><Loader2 className="size-3.5 animate-spin" /> Sending…</>
                    ) : state === 'sent' ? (
                      <><Check className="size-3.5" /> Sent</>
                    ) : state === 'error' ? (
                      'Retry'
                    ) : (
                      <><Send className="size-3.5" /> Send claim link</>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
