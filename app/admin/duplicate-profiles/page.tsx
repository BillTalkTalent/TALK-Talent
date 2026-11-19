import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users2 } from 'lucide-react'
import DuplicateProfilesManager from './duplicate-profiles-manager'

export default async function AdminDuplicateProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('is_superadmin').eq('id', user.id).single()
  if (!me?.is_superadmin) redirect('/admin')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl flex items-center justify-center bg-violet-500">
          <Users2 className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Duplicate Profiles</h1>
          <p className="text-xs text-zinc-500">Find a member&apos;s duplicate accounts and merge them into one</p>
        </div>
      </div>

      <DuplicateProfilesManager />
    </div>
  )
}
