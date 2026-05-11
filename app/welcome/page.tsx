import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WelcomeWizard from './welcome-wizard'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: chapters }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('chapters').select('id, name, description').order('sort_order'),
  ])

  if (!profile) redirect('/login')
  if ((profile as any).has_onboarded) redirect('/dashboard') // eslint-disable-line @typescript-eslint/no-explicit-any

  return <WelcomeWizard profile={profile} chapters={chapters ?? []} />
}
