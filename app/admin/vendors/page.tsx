import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createVendorAccountAndInvite } from '@/lib/vendor-invite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateVendorForm from './create-vendor-form'
import VendorList from './vendor-list'
import SponsorshipOpportunities from './sponsorship-opportunities'
import ClaimRequests from './claim-requests'

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

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>
}) {
  const { leadId } = await searchParams
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

  return (
    <div className="space-y-6">
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
