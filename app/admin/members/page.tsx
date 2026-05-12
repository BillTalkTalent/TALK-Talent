import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MembersTable from './members-table'
import type { Profile } from '@/lib/supabase/types'

async function setRole(id: string, role: 'member' | 'board_member' | 'admin') {
  'use server'
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('profiles').update({ role }).eq('id', id)
  revalidatePath('/admin/members')
}

async function suspendMember(id: string) {
  'use server'
  const supabase = await createClient()
  // Set back to pending — removes their access, shows in pending queue so you can re-approve if needed
  await supabase.from('profiles').update({ status: 'rejected', rejection_note: 'Removed by admin' }).eq('id', id)
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
        <MembersTable members={members ?? []} setRole={setRole} suspendMember={suspendMember} />
      </CardContent>
    </Card>
  )
}
