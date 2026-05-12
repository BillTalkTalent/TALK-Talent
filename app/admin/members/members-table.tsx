'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import type { Profile } from '@/lib/supabase/types'
import { Shield, Star, User, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'member' | 'board_member' | 'admin'

interface MembersTableProps {
  members: Profile[]
  setRole: (id: string, role: Role) => Promise<void>
  suspendMember: (id: string) => Promise<void>
}

const ROLES: { value: Role; label: string; icon: typeof User; color: string }[] = [
  { value: 'member',       label: 'Member',       icon: User,      color: 'text-zinc-500' },
  { value: 'board_member', label: 'Board Member',  icon: Star,      color: 'text-amber-500' },
  { value: 'admin',        label: 'Admin',         icon: Shield,    color: 'text-red-500' },
]

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin')        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100"><Shield className="size-2.5" />Admin</span>
  if (role === 'board_member') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100"><Star className="size-2.5" />Board</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-200"><User className="size-2.5" />Member</span>
}

function RoleDropdown({ member, setRole }: { member: Profile; setRole: (id: string, role: Role) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pick(role: Role) {
    if (role === member.role) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    await setRole(member.id, role)
    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white transition-colors disabled:opacity-50"
      >
        <RoleBadge role={member.role} />
        <ChevronDown className="size-3 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl border border-zinc-100 shadow-lg z-10 py-1 overflow-hidden">
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => pick(r.value)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors',
                member.role === r.value && 'bg-zinc-50 font-semibold'
              )}
            >
              <r.icon className={cn('size-3.5', r.color)} />
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MembersTable({ members, setRole, suspendMember }: MembersTableProps) {
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

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
            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
              <th className="py-2.5 pr-4 pl-3 font-semibold">Name</th>
              <th className="py-2.5 pr-4 font-semibold">Email</th>
              <th className="py-2.5 pr-4 font-semibold">Company</th>
              <th className="py-2.5 pr-4 font-semibold">Title</th>
              <th className="py-2.5 pr-4 font-semibold">Role</th>
              <th className="py-2.5 pr-4 font-semibold">Joined</th>
              <th className="py-2.5 pr-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-zinc-400">No members found.</td></tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-3 pr-4 pl-3 font-medium text-zinc-900">{member.full_name}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{member.email}</td>
                  <td className="py-3 pr-4 text-zinc-500">{member.company ?? '—'}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{member.title ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <RoleDropdown member={member} setRole={setRole} />
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 text-xs">
                    {format(new Date(member.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 pr-3">
                    {confirmId === member.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500 whitespace-nowrap">Remove access?</span>
                        <form action={suspendMember.bind(null, member.id)}>
                          <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Yes</button>
                        </form>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(member.id)}
                        className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
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
