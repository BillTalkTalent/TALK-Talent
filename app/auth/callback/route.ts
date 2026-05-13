import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorCode = searchParams.get('error_code')

  // Supabase bounces expired/invalid OTP links back here with error params
  if (errorCode === 'otp_expired' || searchParams.get('error') === 'access_denied') {
    redirect('/login?error=link_expired')
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(next)
    }
  }

  redirect('/login')
}
