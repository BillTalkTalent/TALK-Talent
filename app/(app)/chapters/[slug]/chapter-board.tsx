'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Pin, Plus, X, Send, Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Post = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  created_at: string
  author_id: string | null
  profiles: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null
}

interface ChapterBoardProps {
  chapterId: string
  initialPosts: Post[]
  currentUserId: string
  currentUserRole: string
  canPost: boolean
  isLead: boolean
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function ChapterBoard({
  chapterId, initialPosts, currentUserId, currentUserRole, canPost, isLead
}: ChapterBoardProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [composing, setComposing] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const canModerate = isLead || currentUserRole === 'admin'

  async function submitPost() {
    if (!newTitle.trim() || !newBody.trim()) return
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chapter_posts')
      .insert({ chapter_id: chapterId, author_id: currentUserId, title: newTitle.trim(), body: newBody.trim() })
      .select('*, profiles(id, full_name, avatar_url, role)')
      .single()

    if (error) { toast.error('Failed to post.'); setSaving(false); return }
    setPosts(prev => [data, ...prev])
    setNewTitle(''); setNewBody(''); setComposing(false)
    toast.success('Posted!')
    setSaving(false)
  }

  async function deletePost(postId: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('chapter_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post deleted.')
  }

  async function togglePin(post: Post) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('chapter_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
    toast.success(post.is_pinned ? 'Unpinned.' : 'Pinned to top.')
  }

  return (
    <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-[#8b5cf6]" />
          <span className="font-semibold text-sm text-zinc-900">Chapter Discussion</span>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{posts.length}</span>
        </div>
        {canPost && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8b5cf6] text-white text-xs font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            <Plus className="size-3.5" /> New Post
          </button>
        )}
      </div>

      {/* Compose */}
      {composing && (
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 space-y-3">
          <input
            autoFocus
            placeholder="Post title…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6] transition-colors bg-white"
            disabled={saving}
          />
          <textarea
            placeholder="Share an update, ask a question, or start a discussion…"
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            rows={4}
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6] transition-colors resize-none bg-white"
            disabled={saving}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submitPost}
              disabled={saving || !newTitle.trim() || !newBody.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Post
            </button>
            <button
              onClick={() => { setComposing(false); setNewTitle(''); setNewBody('') }}
              className="px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 && !composing && (
        <div className="py-12 text-center">
          <MessageSquare className="size-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No posts yet.</p>
          {canPost && (
            <button onClick={() => setComposing(true)} className="mt-2 text-sm text-[#8b5cf6] hover:underline font-semibold">
              Be the first to post
            </button>
          )}
          {!canPost && (
            <p className="text-xs text-zinc-400 mt-1">Join this chapter to post here.</p>
          )}
        </div>
      )}

      <div className="divide-y divide-zinc-50">
        {posts.map(post => {
          const author = post.profiles
          const isAuthor = post.author_id === currentUserId
          const isAuthorLead = author?.role === 'board_member' || author?.role === 'admin'
          const expanded = expandedId === post.id

          return (
            <div key={post.id} className={cn('px-5 py-4', post.is_pinned && 'bg-amber-50/30')}>
              <div className="flex items-start gap-3">
                <Avatar className="size-9 shrink-0">
                  {author?.avatar_url && <AvatarImage src={author.avatar_url} alt={author.full_name ?? ''} />}
                  <AvatarFallback className="text-xs font-bold" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
                    {getInitials(author?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900">{author?.full_name ?? 'Unknown'}</span>
                        {isAuthorLead && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase">
                            <Star className="size-2.5 fill-amber-500 text-amber-500" /> Lead
                          </span>
                        )}
                        {post.is_pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                            <Pin className="size-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canModerate && (
                        <button onClick={() => togglePin(post)} title={post.is_pinned ? 'Unpin' : 'Pin to top'}
                          className={cn('p-1.5 rounded-lg transition-colors', post.is_pinned ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-zinc-300 hover:text-amber-400 hover:bg-amber-50')}>
                          <Pin className="size-3.5" />
                        </button>
                      )}
                      {(isAuthor || canModerate) && (
                        <button onClick={() => deletePost(post.id)} title="Delete post"
                          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-zinc-900">{post.title}</p>
                  <p className={cn('mt-1 text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap', !expanded && 'line-clamp-3')}>
                    {post.body}
                  </p>
                  {post.body.length > 200 && (
                    <button onClick={() => setExpandedId(expanded ? null : post.id)}
                      className="mt-1 text-xs text-[#8b5cf6] hover:underline font-semibold">
                      {expanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
