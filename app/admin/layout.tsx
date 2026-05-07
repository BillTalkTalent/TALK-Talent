import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-zinc-200 bg-white px-6 py-3">
        <h1 className="text-base font-semibold text-zinc-900">Admin Panel</h1>
      </header>
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  )
}
