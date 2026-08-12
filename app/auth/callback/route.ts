import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorCode = searchParams.get('error_code')
  const linkedinConnect = searchParams.get('linkedin_connect') === '1'

  // Supabase bounces expired/invalid OTP links back here with error params
  if (errorCode === 'otp_expired' || searchParams.get('error') === 'access_denied') {
    redirect('/login?error=link_expired')
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (linkedinConnect) {
        await saveLinkedInConnection(data.user.id, data.session.provider_token)
        redirect(`${next}${next.includes('?') ? '&' : '?'}linkedin=connected`)
      }
      redirect(next)
    }
  }

  redirect('/login')
}

// Persists the LinkedIn access token needed to post on the member's behalf.
// Requires this OAuth pass to have requested the w_member_social scope
// (see connectLinkedIn() in components/share-on-linkedin-button.tsx) —
// a plain sign-in pass has no provider_token capable of posting.
async function saveLinkedInConnection(userId: string, providerToken: string | undefined | null) {
  if (!providerToken) return

  const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${providerToken}` },
  })
  if (!userinfoRes.ok) return
  const userinfo = await userinfoRes.json()
  if (!userinfo.sub) return

  const admin = createAdminClient()
  await admin.from('linkedin_connections').upsert({
    user_id: userId,
    access_token: providerToken,
    member_urn: userinfo.sub,
    connected_at: new Date().toISOString(),
  })
}
