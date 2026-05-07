import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

async function createVendor(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('vendors').insert({
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    website: formData.get('website') as string || null,
    category: formData.get('category') as string || null,
    contact_name: formData.get('contact_name') as string || null,
    contact_email: formData.get('contact_email') as string || null,
    is_featured: formData.get('is_featured') === 'on',
    submitted_by: user.id,
  })
  revalidatePath('/admin/vendors')
}

async function deleteVendor(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('vendors').delete().eq('id', id)
  revalidatePath('/admin/vendors')
}

export default async function AdminVendorsPage() {
  const supabase = await createClient()
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Add vendor form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVendor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="e.g. ATS, Sourcing" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" name="contact_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" name="contact_email" type="email" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="is_featured" name="is_featured" className="size-4 rounded border-zinc-300" />
              <Label htmlFor="is_featured" className="cursor-pointer">Featured vendor</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add Vendor</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Vendor list */}
      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {!vendors || vendors.length === 0 ? (
            <p className="text-sm text-zinc-500">No vendors yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900">{vendor.name}</p>
                      {vendor.is_featured && <Badge variant="secondary">Featured</Badge>}
                      {vendor.category && (
                        <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
                      )}
                    </div>
                    {vendor.description && (
                      <p className="text-sm text-zinc-500 line-clamp-2">{vendor.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-zinc-400">
                      {vendor.website && (
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {vendor.website}
                        </a>
                      )}
                      {vendor.contact_email && <span>{vendor.contact_email}</span>}
                    </div>
                  </div>
                  <form action={deleteVendor.bind(null, vendor.id)}>
                    <Button type="submit" size="sm" variant="destructive">Delete</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
