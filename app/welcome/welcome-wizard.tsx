'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Camera, CheckCircle2, Loader2, MessageSquare, Users, Sparkles } from 'lucide-react'
import type { Profile } from '@/lib/supabase/types'

interface Chapter { id: string; name: string; description: string | null }

interface Props {
  profile: Profile
  chapters: Chapter[]
}

export default function WelcomeWizard({ profile, chapters }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [title, setTitle] = useState(profile.title ?? '')
  const [company, setCompany] = useState(profile.company ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)

  // Step 2 fields
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])

  const firstName = fullName.split(' ')[0] || 'there'

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function saveStep1() {
    setLoading(true)
    await supabase.from('profiles').update({
      full_name: fullName,
      title: title || null,
      company: company || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    }).eq('id', profile.id)
    setLoading(false)
    setStep(2)
  }

  async function saveStep2() {
    setLoading(true)
    if (selectedChapters.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('chapter_memberships').upsert(
        selectedChapters.map(chapterId => ({
          user_id: profile.id,
          chapter_id: chapterId,
        })),
        { onConflict: 'chapter_id,user_id' }
      )
      if (error) console.error('[saveStep2] chapter membership error:', error)
    }
    setLoading(false)
    setStep(3)
  }

  async function finish() {
    setLoading(true)
    await supabase.from('profiles').update({ has_onboarded: true } as any).eq('id', profile.id) // eslint-disable-line @typescript-eslint/no-explicit-any
    router.push('/dashboard')
  }

  async function goToForum() {
    setLoading(true)
    await supabase.from('profiles').update({ has_onboarded: true } as any).eq('id', profile.id) // eslint-disable-line @typescript-eslint/no-explicit-any
    router.push('/forum')
  }

  const toggleChapter = (id: string) =>
    setSelectedChapters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)' }}>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-1 transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%`, background: 'linear-gradient(90deg, #00b894, #00d4aa)' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-3 pt-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-3">
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s < step ? 'bg-[#00d4aa] text-[#0d0d0d]' :
              s === step ? 'bg-white text-[#0d0d0d]' :
              'bg-white/10 text-white/30'
            }`}>
              {s < step ? <CheckCircle2 className="size-4" /> : s}
            </div>
            {s < 3 && <div className={`h-px w-10 transition-all ${s < step ? 'bg-[#00d4aa]' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* ── Step 1: Profile ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] text-xs font-bold mb-4">
                  <Sparkles className="size-3" /> You&apos;re in!
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Welcome to TALK, {firstName}!</h1>
                <p className="text-white/50 text-base">Let&apos;s set up your profile so members know who you are. Takes 60 seconds.</p>
              </div>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="relative">
                  <Avatar className="size-20 ring-2 ring-[#00d4aa]/40">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback style={{ background: 'linear-gradient(135deg,#00b894,#00d4aa)', color: '#0d0d0d' }}
                      className="text-2xl font-black">
                      {fullName?.[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                    style={{ background: 'linear-gradient(135deg,#00b894,#00d4aa)' }}>
                    {uploading ? <Loader2 className="size-3.5 text-[#0d0d0d] animate-spin" /> : <Camera className="size-3.5 text-[#0d0d0d]" />}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <p className="text-xs text-white/30">Upload a photo</p>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white/50">Full name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00d4aa]/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-white/50">Job title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Head of Talent"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00d4aa]/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-white/50">Company</Label>
                    <Input value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00d4aa]/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-white/50">
                    One-line bio <span className="text-white/25 font-normal">(optional)</span>
                  </Label>
                  <Input value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Building talent teams at fast-growing startups"
                    maxLength={160}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00d4aa]/50" />
                  {bio.length > 120 && (
                    <p className="text-xs text-right" style={{ color: bio.length >= 160 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
                      {160 - bio.length} characters left
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={saveStep1}
                disabled={loading || !fullName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[#0d0d0d] disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)' }}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
              </button>
            </div>
          )}

          {/* ── Step 2: Chapters ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,170,0.15)' }}>
                  <Users className="size-7 text-[#00d4aa]" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Join your chapters</h1>
                <p className="text-white/50 text-base">Chapters are sub-groups within TALK. Pick the ones that match your focus area.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {chapters.map(chapter => {
                  const selected = selectedChapters.includes(chapter.id)
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => toggleChapter(chapter.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                        selected
                          ? 'border-[#00d4aa]/50 bg-[#00d4aa]/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                      }`}
                    >
                      <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-[#00d4aa] bg-[#00d4aa]' : 'border-white/20'
                      }`}>
                        {selected && <CheckCircle2 className="size-3 text-[#0d0d0d]" />}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${selected ? 'text-white' : 'text-white/70'}`}>{chapter.name}</p>
                        {chapter.description && (
                          <p className="text-xs text-white/30 mt-0.5">{chapter.description}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-2xl font-semibold text-white/40 border border-white/10 hover:border-white/20 transition-all text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white/40 border border-white/10 hover:border-white/20 transition-all text-sm"
                >
                  Skip for now
                </button>
                <button
                  onClick={saveStep2}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[#0d0d0d] disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #00b894, #00d4aa)' }}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: You're in ── */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-black text-white mb-3">You&apos;re all set, {firstName}!</h1>
                <p className="text-white/50 text-base max-w-sm mx-auto">
                  Welcome to the TALK community. Here are the best ways to get started.
                </p>
              </div>

              <div className="space-y-3 text-left">
                {[
                  {
                    icon: MessageSquare,
                    color: '#8b5cf6',
                    title: 'Introduce yourself',
                    desc: 'Drop a note in the forum — tell the community who you are and what you\'re working on.',
                    action: goToForum,
                    cta: 'Go to Forum',
                    primary: true,
                  },
                  {
                    icon: Users,
                    color: '#00d4aa',
                    title: 'Browse the member directory',
                    desc: 'See who\'s in TALK and find people worth connecting with.',
                    action: finish,
                    cta: 'Go to Dashboard',
                    primary: false,
                  },
                ].map(({ icon: Icon, color, title, desc, action, cta, primary }) => (
                  <button
                    key={title}
                    onClick={action}
                    disabled={loading}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] disabled:opacity-60 ${
                      primary
                        ? 'border-[#8b5cf6]/30 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/15'
                        : 'border-white/10 bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <div className="size-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                      <Icon className="size-5" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white">{title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                    </div>
                    <span className="text-xs font-semibold text-white/40 shrink-0">{cta} →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
