import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SponsorForm from './sponsor-form'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') throw new Error('Forbidden')
}

async function addSponsor(fd: FormData) {
  'use server'
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.from('newsletter_sponsors').insert({
    name: (fd.get('name') as string)?.trim(),
    logo_url: (fd.get('logo_url') as string) || null,
    url: (fd.get('url') as string) || null,
    blurb: (fd.get('blurb') as string) || null,
    offer: (fd.get('offer') as string)?.trim() || null,
    offer_url: (fd.get('offer_url') as string) || null,
    offer_cta: (fd.get('offer_cta') as string)?.trim() || null,
    expires_at: fd.get('expires_at') as string,
  })
  revalidatePath('/admin/newsletter/sponsors')
}

async function deleteSponsor(fd: FormData) {
  'use server'
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.from('newsletter_sponsors').delete().eq('id', fd.get('id') as string)
  revalidatePath('/admin/newsletter/sponsors')
}

export default async function SponsorsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: sponsors } = await db
    .from('newsletter_sponsors')
    .select('*')
    .order('created_at', { ascending: false })

  const today = new Date().toISOString().slice(0, 10)
  const activeId = (sponsors ?? []).find((s: { expires_at: string }) => s.expires_at >= today)?.id ?? null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin/newsletter" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Back to newsletters
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Newsletter Sponsors</h1>
        <p className="text-sm text-zinc-500">
          The active sponsor gets a &ldquo;Presented by&rdquo; masthead at the top of every newsletter — plus a
          &ldquo;Special offer&rdquo; callout at the bottom if you add one — automatically, until its run-until date.
          One sponsor runs at a time (the newest un-expired one).
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add a sponsor</CardTitle></CardHeader>
        <CardContent><SponsorForm addSponsor={addSponsor} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sponsors</CardTitle></CardHeader>
        <CardContent>
          {!sponsors || sponsors.length === 0 ? (
            <p className="text-sm text-zinc-500">No sponsors yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {sponsors.map((s: { id: string; name: string; logo_url: string | null; offer: string | null; expires_at: string }) => {
                const expired = s.expires_at < today
                const isActive = s.id === activeId
                return (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {s.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="h-8 w-auto max-w-[90px] object-contain shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">{s.name}</p>
                        <p className="text-xs text-zinc-400">runs until {s.expires_at}{s.offer ? ' · has offer' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
                        : expired ? <Badge variant="secondary">Expired</Badge>
                        : <Badge variant="outline">Queued</Badge>}
                      <form action={deleteSponsor}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
