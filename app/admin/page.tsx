import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Calendar, Building2 } from 'lucide-react'

async function approveMember(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
  revalidatePath('/admin')
}

async function rejectMember(id: string, note: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').update({ status: 'rejected', rejection_note: note }).eq('id', id)
  revalidatePath('/admin')
}

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { data: pendingMembers },
    { count: approvedCount },
    { count: pendingCount },
    { count: eventCount },
    { count: vendorCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('vendors').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Approved Members', value: approvedCount ?? 0, icon: Users },
    { label: 'Pending Approvals', value: pendingCount ?? 0, icon: Clock },
    { label: 'Total Events', value: eventCount ?? 0, icon: Calendar },
    { label: 'Total Vendors', value: vendorCount ?? 0, icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-md">
                  <Icon className="size-4 text-zinc-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Approvals
            {(pendingCount ?? 0) > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendingMembers || pendingMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">No pending applications.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pendingMembers.map((member) => (
                <li key={member.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-zinc-900">{member.full_name}</p>
                    <p className="text-sm text-zinc-500">{member.email}</p>
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {member.linkedin_url}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <form action={approveMember.bind(null, member.id)}>
                      <Button type="submit" size="sm" variant="default">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectMember.bind(null, member.id, 'Does not meet community criteria')}>
                      <Button type="submit" size="sm" variant="destructive">
                        Reject
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" render={<Link href="/admin/members" />}>
          Manage Members
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin/events" />}>
          Manage Events
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin/vendors" />}>
          Manage Vendors
        </Button>
      </div>
    </div>
  )
}
