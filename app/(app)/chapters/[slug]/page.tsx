import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users, Star, Globe, Mail, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ChapterBoard from './chapter-board'

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chapter } = await (supabase as any)
    .from('chapters')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!chapter) notFound()

  const [membersResult, leadsResult, postsResult, myMembershipResult] = await Promise.all([
    supabase
      .from('chapter_memberships')
      .select('user_id, profiles(id, full_name, avatar_url, title, company)')
      .eq('chapter_id', chapter.id)
      .limit(36),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('chapter_leads')
      .select('user_id, profiles(id, full_name, avatar_url, title, company, role)')
      .eq('chapter_id', chapter.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('chapter_posts')
      .select('*, profiles(id, full_name, avatar_url, role)')
      .eq('chapter_id', chapter.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('chapter_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter.id)
      .eq('user_id', user?.id ?? ''),
  ])

  type MemberProfile = { id: string; full_name: string | null; avatar_url: string | null; title: string | null; company: string | null }
  type LeadProfile = MemberProfile & { role: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (membersResult.data ?? []).map((m: any) => m.profiles).filter(Boolean) as MemberProfile[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads = (leadsResult.data ?? []).map((l: any) => l.profiles).filter(Boolean) as LeadProfile[]
  const posts = postsResult.data ?? []
  const isMember = (myMembershipResult.count ?? 0) > 0

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = currentProfile?.role === 'admin'
  const isLead = leads.some(l => l.id === user?.id)
  const canEdit = isAdmin || isLead
  const canPost = isMember || isLead || isAdmin

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + edit */}
      <div className="flex items-center justify-between">
        <Link href="/chapters" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="size-4" /> All Chapters
        </Link>
        {canEdit && (
          <Link
            href={`/chapters/${slug}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors border border-zinc-200"
          >
            <Pencil className="size-3.5" /> Edit Chapter
          </Link>
        )}
      </div>

      {/* Banner */}
      {chapter.banner_url && (
        <div className="rounded-2xl overflow-hidden h-40 border border-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chapter.banner_url} alt={`${chapter.name} banner`} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Chapter header card */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl flex items-center justify-center text-4xl bg-zinc-50 border border-zinc-100 shrink-0">
              {chapter.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{chapter.name}</h1>
              {chapter.description && (
                <p className="text-sm text-zinc-500 mt-1">{chapter.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
                {leads.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="size-3 text-amber-400" />
                    {leads.length} lead{leads.length !== 1 ? 's' : ''}
                  </span>
                )}
                {chapter.website_url && (
                  <a href={chapter.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#E8503A] hover:underline">
                    <Globe className="size-3" /> Website
                  </a>
                )}
                {chapter.contact_email && (
                  <a href={`mailto:${chapter.contact_email}`}
                    className="flex items-center gap-1 text-[#E8503A] hover:underline">
                    <Mail className="size-3" /> {chapter.contact_email}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div>
            {isMember ? (
              <span className="text-xs font-semibold text-[#E8503A] bg-[#F07058]/10 border border-[#F07058]/20 px-3 py-1.5 rounded-xl">
                ✓ You&apos;re a member
              </span>
            ) : (
              <Link href="/chapters"
                className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl hover:border-zinc-300 transition-colors">
                Join this chapter
              </Link>
            )}
          </div>
        </div>

        {/* Long description */}
        {chapter.long_description && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{chapter.long_description}</p>
          </div>
        )}

        {/* Chapter leads */}
        {leads.length > 0 && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Chapter Lead{leads.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              {leads.map(lead => (
                <Link key={lead.id} href={`/members/${lead.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors group">
                  <Avatar className="size-9 ring-2 ring-amber-200">
                    {lead.avatar_url && <AvatarImage src={lead.avatar_url} alt={lead.full_name ?? ''} />}
                    <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-700">
                      {getInitials(lead.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors">
                        {lead.full_name}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" /> Lead
                      </span>
                    </div>
                    {(lead.title || lead.company) && (
                      <p className="text-xs text-zinc-400">{[lead.title, lead.company].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discussion + members */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Discussion board — 2/3 width */}
        <div className="lg:col-span-2">
          <ChapterBoard
            chapterId={chapter.id}
            initialPosts={posts}
            currentUserId={user?.id ?? ''}
            currentUserRole={currentProfile?.role ?? 'member'}
            canPost={canPost}
            isLead={isLead}
          />
        </div>

        {/* Members sidebar */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-3 h-fit">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Members</p>
          <div className="flex flex-wrap gap-2">
            {members.slice(0, 24).map(m => (
              <Link key={m.id} href={`/members/${m.id}`} title={m.full_name ?? undefined}>
                <Avatar className="size-9 hover:ring-2 hover:ring-[#F07058] transition-all">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ''} />}
                  <AvatarFallback className="text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #E8503A, #F07058)', color: 'white' }}>
                    {getInitials(m.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ))}
          </div>
          {members.length > 24 && (
            <p className="text-xs text-zinc-400">+{members.length - 24} more members</p>
          )}
          {members.length === 0 && (
            <p className="text-xs text-zinc-400 italic">No members yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
