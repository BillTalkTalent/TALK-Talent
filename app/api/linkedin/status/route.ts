import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('linkedin_connections')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ connected: !!data })
}
