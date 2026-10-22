'use client'

import { useRouter } from 'next/navigation'

type ChapterOption = { id: string; name: string; type: 'geographic' | 'topic' }

export default function ChapterFilter({ chapters, selectedId }: { chapters: ChapterOption[]; selectedId: string }) {
  const router = useRouter()
  const geo = chapters.filter((c) => c.type === 'geographic').sort((a, b) => a.name.localeCompare(b.name))
  const topic = chapters.filter((c) => c.type === 'topic').sort((a, b) => a.name.localeCompare(b.name))

  return (
    <select
      value={selectedId}
      onChange={(e) => {
        const id = e.target.value
        router.push(id ? `/admin/demographics?chapter=${id}` : '/admin/demographics')
      }}
      className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm bg-white text-zinc-700 focus:outline-none focus:border-zinc-400"
    >
      <option value="">All members</option>
      <optgroup label="Geographic chapters">
        {geo.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </optgroup>
      <optgroup label="Topic chapters">
        {topic.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </optgroup>
    </select>
  )
}
