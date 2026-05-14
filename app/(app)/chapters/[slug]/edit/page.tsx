import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, BookOpen } from 'lucide-react'
import ChapterEditForm from './chapter-edit-form'

export default async function ChapterEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chapter } = await (supabase as any)
    .from('chapters')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!chapter) notFound()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leadRow } = await (supabase as any)
    .from('chapter_leads')
    .select('id')
    .eq('chapter_id', chapter.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = currentProfile?.role === 'admin'
  const isLead = !!leadRow

  if (!isAdmin && !isLead) {
    redirect(`/chapters/${slug}`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href={`/chapters/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
        <ArrowLeft className="size-4" /> Back to chapter
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl flex items-center justify-center text-2xl bg-zinc-50 border border-zinc-100">
          {chapter.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Edit Chapter</h1>
          <p className="text-sm text-zinc-500">{chapter.name}</p>
        </div>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-1 rounded-full uppercase tracking-wide">
            Admin
          </span>
        )}
        {!isAdmin && isLead && (
          <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
            <BookOpen className="size-2.5" /> Chapter Lead
          </span>
        )}
      </div>

      <ChapterEditForm chapter={chapter} isAdmin={isAdmin} slug={slug} />
    </div>
  )
}
