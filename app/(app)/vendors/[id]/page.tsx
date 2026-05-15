import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Building2, Briefcase, Users } from 'lucide-react'
import ReviewForm from './review-form'
import VendorEditForm from './vendor-edit-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function Stars({ n }: { n: number | null }) {
  if (!n) return <span className="text-zinc-300 text-sm">—</span>
  return <span className="text-amber-400">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function avg(reviews: any[], key: string): string | null {
  const vals = reviews.map(r => r[key]).filter((v): v is number => typeof v === 'number')
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'reviews' } = await searchParams
  const supabase = await createClient()

  const [vendorRes, reviewsRes, userRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('vendors').select('*').eq('id', id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('vendor_reviews')
      .select('*, profiles(id,full_name,avatar_url,title,company)')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  const vendor = vendorRes.data
  if (!vendor) notFound()

  const user = userRes.data.user

  // Fetch current user's profile to check role
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'board_member'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewList: any[] = reviewsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myReview = reviewList.find((r: any) => r.reviewer_id === user?.id) ?? null

  const tabs = [
    { key: 'reviews', label: `Reviews (${reviewList.length})` },
    { key: 'write', label: myReview ? 'Edit Your Review' : 'Write a Review' },
    ...(isAdmin ? [{ key: 'edit', label: '✏️ Edit Details' }] : []),
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/vendors" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Back to vendors
      </Link>

      {/* ── Header card ── */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          {vendor.logo_url ? (
            <img src={vendor.logo_url} alt={vendor.name} className="size-16 rounded-xl object-contain border border-zinc-100 bg-white p-1 flex-shrink-0" />
          ) : (
            <div className="size-16 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="size-7 text-sky-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-zinc-900">{vendor.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {vendor.category && (
                <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{vendor.category}</span>
              )}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <ExternalLink className="size-3" /> {vendor.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            {vendor.description && (
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{vendor.description}</p>
            )}
          </div>
        </div>

        {/* ── Industries & company sizes ── */}
        {((vendor.industries_served?.length ?? 0) > 0 || (vendor.company_sizes_served?.length ?? 0) > 0) && (
          <div className="mt-5 pt-5 border-t border-zinc-100 grid sm:grid-cols-2 gap-4">
            {(vendor.industries_served?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  <Briefcase className="size-3.5" /> Industries Served
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.industries_served.map((ind: string) => (
                    <span key={ind} className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(vendor.company_sizes_served?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  <Users className="size-3.5" /> Company Sizes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.company_sizes_served.map((s: string) => (
                    <span key={s} className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rating summary ── */}
        {reviewList.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-zinc-100">
            {[
              { key: 'overall_rating', label: 'Overall' },
              { key: 'ease_of_use_rating', label: 'Ease of Use' },
              { key: 'support_rating', label: 'Support' },
              { key: 'value_rating', label: 'Value' },
            ].map(({ key, label }) => (
              <div key={key} className="text-center">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{avg(reviewList, key) ?? '—'}</p>
                <p className="text-amber-400 text-xs">{avg(reviewList, key) ? '★'.repeat(Math.round(Number(avg(reviewList, key)))) : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl w-fit">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/vendors/${id}?tab=${key}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'edit' && isAdmin ? (
        <VendorEditForm vendor={vendor} />
      ) : tab === 'write' ? (
        <ReviewForm vendorId={vendor.id} existingReview={myReview} />
      ) : (
        <div className="space-y-3">
          {reviewList.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-12 text-center">
              <p className="text-zinc-400">No reviews yet. Be the first!</p>
            </div>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reviewList.map((r: any) => (
              <div key={r.id} className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <Avatar size="sm">
                    {r.profiles?.avatar_url && <AvatarImage src={r.profiles.avatar_url} alt={r.profiles?.full_name ?? ''} />}
                    <AvatarFallback>{getInitials(r.profiles?.full_name ?? null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900">{r.profiles?.full_name ?? 'Anonymous'}</p>
                    {(r.profiles?.title || r.profiles?.company) && (
                      <p className="text-xs text-zinc-500">{[r.profiles?.title, r.profiles?.company].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div><span className="text-xs text-zinc-500 block">Overall</span><Stars n={r.overall_rating} /></div>
                      <div><span className="text-xs text-zinc-500 block">Ease</span><Stars n={r.ease_of_use_rating} /></div>
                      <div><span className="text-xs text-zinc-500 block">Support</span><Stars n={r.support_rating} /></div>
                      <div><span className="text-xs text-zinc-500 block">Value</span><Stars n={r.value_rating} /></div>
                    </div>
                    <p className="mt-3 text-sm text-zinc-700 whitespace-pre-wrap">{r.summary}</p>
                    {r.pros && (<div className="mt-2 text-sm"><span className="text-emerald-700 font-semibold">Pros:</span> <span className="text-zinc-600">{r.pros}</span></div>)}
                    {r.cons && (<div className="mt-1 text-sm"><span className="text-red-700 font-semibold">Cons:</span> <span className="text-zinc-600">{r.cons}</span></div>)}
                    {(r.tenure_months || r.selected_it != null) && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {r.tenure_months ? <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">Used {r.tenure_months} mo</span> : null}
                        {r.selected_it === true && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Selected it</span>}
                        {r.selected_it === false && <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full">Did not select</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
