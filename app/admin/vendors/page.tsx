import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createVendorAccountAndInvite } from '@/lib/vendor-invite'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateVendorForm from './create-vendor-form'
import VendorList from './vendor-list'
import SponsorshipOpportunities from './sponsorship-opportunities'
import ClaimRequests from './claim-requests'
import VendorAccountHolders from './vendor-account-holders'

// Invites someone to self-manage a vendor's listing directly (admin-initiated,
// skips the claim-request review step below).
async function inviteVendorManager(vendorId: string, email: string, fullName: string) {
  'use server'
  await createVendorAccountAndInvite(vendorId, email, fullName)
  revalidatePath('/admin/vendors')
}

// Approves a self-serve claim request (migration 107): creates the vendor
// account + sends the same invite email as inviteVendorManager above, then
// marks the request approved so it drops off the pending queue.
async function approveClaimRequest(requestId: string, vendorId: string, email: string, fullName: string) {
  'use server'
  const admin = createAdminClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  await createVendorAccountAndInvite(vendorId, email, fullName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('vendor_claim_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
    .eq('id', requestId)
  revalidatePath('/admin/vendors')
}

async function rejectClaimRequest(requestId: string) {
  'use server'
  const admin = createAdminClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('vendor_claim_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
    .eq('id', requestId)
  revalidatePath('/admin/vendors')
}

// The inverse of convertMemberToVendor (app/admin/members/page.tsx): drops
// the vendor_accounts row and restores their TALK membership. Only offered
// in the UI for a vendor_accounts holder whose profiles row shows they were
// actually converted from a member — a vendor contact who was never a
// member has no profile to restore.
async function convertVendorBackToMember(id: string) {
  'use server'
  try {
    await requireSuperAdmin()
    const admin = createAdminClient()
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delError } = await (admin as any).from('vendor_accounts').delete().eq('id', id)
    if (delError) throw new Error(`Failed to remove vendor account: ${delError.message}`)

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved', rejection_note: null })
      .eq('id', id)
    if (error) {
      throw new Error(error.message.includes('LinkedIn') ? error.message : `Failed to restore member access: ${error.message}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('match_legacy_member', { p_profile_id: id })

    revalidatePath('/admin/vendors')
    revalidatePath('/admin/members')
  } catch (err) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : 'Failed to convert back to member'
    redirect(`/admin/vendors?error=${encodeURIComponent(message)}`)
  }
}

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; error?: string }>
}) {
  const { leadId, error: actionError } = await searchParams
  const supabase = await createClient()
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  let lead: { id: string; company_name: string; contact_name: string | null; contact_email: string; website: string | null; message: string | null } | null = null
  if (leadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('vendor_leads')
      .select('id, company_name, contact_name, contact_email, website, message')
      .eq('id', leadId)
      .single()
    lead = data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: opportunities } = await (supabase as any)
    .from('sponsorship_opportunities')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimRequests } = await (supabase as any)
    .from('vendor_claim_requests')
    .select('id, vendor_id, full_name, email, title, note, created_at, vendors(name, logo_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendorAccounts } = await (supabase as any)
    .from('vendor_accounts')
    .select('id, vendor_id, full_name, email, created_at, vendors(name)')
    .order('created_at', { ascending: false })

  const vendorAccountIds = (vendorAccounts ?? []).map((a: { id: string }) => a.id)
  const { data: formerMemberProfiles } = vendorAccountIds.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase as any).from('profiles').select('id, status, rejection_note').in('id', vendorAccountIds)
    : { data: [] as { id: string; status: string; rejection_note: string | null }[] }
  const formerMemberMap = new Map<string, { id: string; status: string; rejection_note: string | null }>(
    (formerMemberProfiles ?? []).map((p: { id: string; status: string; rejection_note: string | null }) => [p.id, p]),
  )

  const vendorAccountsWithMemberInfo = (vendorAccounts ?? []).map(
    (a: { id: string; vendor_id: string; full_name: string | null; email: string; created_at: string; vendors: { name: string } | null }) => {
      const priorProfile = formerMemberMap.get(a.id)
      return {
        ...a,
        wasConvertedMember:
          priorProfile?.status === 'rejected' && (priorProfile?.rejection_note ?? '').startsWith('Converted to vendor contact'),
      }
    },
  )

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{actionError}</p>
        </div>
      )}

      {claimRequests && claimRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Claim Requests</CardTitle>
            <p className="text-sm text-zinc-500">
              Self-serve requests to manage a listing. Approving creates their vendor-portal login and emails them a sign-in link.
            </p>
          </CardHeader>
          <CardContent>
            <ClaimRequests
              requests={claimRequests}
              onApprove={approveClaimRequest}
              onReject={rejectClaimRequest}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateVendorForm lead={lead} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorList vendors={vendors ?? []} inviteVendorManager={inviteVendorManager} />
        </CardContent>
      </Card>

      {vendorAccountsWithMemberInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Account Holders</CardTitle>
            <p className="text-sm text-zinc-500">
              Everyone with a vendor-portal login. &ldquo;Convert back to member&rdquo; only appears for someone
              who was a TALK member before being converted here.
            </p>
          </CardHeader>
          <CardContent>
            <VendorAccountHolders accounts={vendorAccountsWithMemberInfo} onConvertBack={convertVendorBackToMember} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sponsorship Opportunities</CardTitle>
          <p className="text-sm text-zinc-500">
            Shown to paying vendors on their portal dashboard. Vendors can inquire — no automatic checkout,
            inquiries land below in Suggestions &amp; Invites for you to follow up.
          </p>
        </CardHeader>
        <CardContent>
          <SponsorshipOpportunities opportunities={opportunities ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
