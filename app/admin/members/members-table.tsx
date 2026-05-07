'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Profile } from '@/lib/supabase/types'

interface MembersTableProps {
  members: Profile[]
  toggleRole: (id: string, currentRole: 'member' | 'admin') => Promise<void>
}

export default function MembersTable({ members, toggleRole }: MembersTableProps) {
  const [search, setSearch] = useState('')

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      !q ||
      m.full_name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.title?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name, email, company…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Company</th>
              <th className="pb-3 pr-4 font-medium">Title</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Role</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-zinc-400">
                  No members found.
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id}>
                  <td className="py-3 pr-4 font-medium text-zinc-900">{member.full_name}</td>
                  <td className="py-3 pr-4 text-zinc-600">{member.email}</td>
                  <td className="py-3 pr-4 text-zinc-600">{member.company ?? '—'}</td>
                  <td className="py-3 pr-4 text-zinc-600">{member.title ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={member.status === 'approved' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={member.role === 'admin' ? 'destructive' : 'outline'}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">
                    {format(new Date(member.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3">
                    <form action={toggleRole.bind(null, member.id, member.role)}>
                      <Button type="submit" size="sm" variant="outline">
                        {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
