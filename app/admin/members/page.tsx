import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MembersTable from './members-table'
import type { Profile } from '@/lib/supabase/types'

async function toggleRole(id: string, currentRole: 'member' | 'admin') {
  'use server'
  const newRole = currentRole === 'admin' ? 'member' : 'admin'
  const supabase = await createClient()
  await supabase.from('profiles').update({ role: newRole }).eq('id', id)
  revalidatePath('/admin/members')
}

export default async function AdminMembersPage() {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Members</CardTitle>
      </CardHeader>
      <CardContent>
        <MembersTable members={members ?? []} toggleRole={toggleRole} />
      </CardContent>
    </Card>
  )
}
