import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findMatchCandidates } from '@/lib/signup/match-candidates'

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
      await flagPossibleDuplicateProfile(data.user)

      if (linkedinConnect) {
        await saveLinkedInConnection(data.user.id, data.session.provider_token)
        redirect(`${next}${next.includes('?') ? '&' : '?'}linkedin=connected`)
      }
      redirect(next)
    }
  }

  redirect('/login')
}

// "Continue with LinkedIn" on the login page (app/login/login-form.tsx) is a
// sign-in *and* sign-up button — Supabase's OAuth flow silently creates a
// brand-new pending profile for anyone it doesn't already recognize by that
// LinkedIn identity. Unlike the email/password signup form, there's no
// "is this you?" step first (see app/api/signup/find-matches), so a member
// who already applied under a different email and comes back through
// LinkedIn OAuth gets a second, disconnected pending profile instead of
// being matched to their first one. Close that gap right after account
// creation: if this OAuth sign-in just created the account, run the same
// matching the signup form uses and, on an unambiguous match, flag it via
// claimed_match_id — the same field the manual "is this you?" flow sets —
// so it surfaces in the admin queue's merge flow (confirmMatch in
// app/admin/page.tsx) instead of sitting as an unrelated applicant.
async function flagPossibleDuplicateProfile(user: {
  id: string
  created_at: string
  last_sign_in_at?: string | null
}) {
  const createdAt = new Date(user.created_at).getTime()
  const signedInAt = new Date(user.last_sign_in_at ?? user.created_at).getTime()
  const justCreated = Math.abs(signedInAt - createdAt) < 10_000
  if (!justCreated) return

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, linkedin_url, claimed_match_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.claimed_match_id || !profile.full_name?.trim()) return

  const candidates = await findMatchCandidates(admin, {
    fullName: profile.full_name,
    linkedinUrl: profile.linkedin_url,
    excludeId: user.id,
  })

  // Only auto-flag when there's exactly one candidate — with more than one,
  // guessing which is correct is an admin call, not ours to make.
  if (candidates.length === 1) {
    await admin.from('profiles').update({ claimed_match_id: candidates[0].id }).eq('id', user.id)
  }
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
