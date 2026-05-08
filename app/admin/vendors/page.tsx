import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateVendorForm from './create-vendor-form'
import VendorList from './vendor-list'

export default async function AdminVendorsPage() {
  const supabase = await createClient()
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateVendorForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorList vendors={vendors ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
