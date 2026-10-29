import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatusSelect from './status-select'

async function setStatus(id: string, status: string) {
  'use server'
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('founder_suggestions').update({ status }).eq('id', id)
  revalidatePath('/admin/founders')
}

export default async function AdminFoundersPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suggestions } = await (supabase as any)
    .from('founder_suggestions')
    .select('id, type, title, status, created_at, profiles(full_name), founder_suggestion_votes(voter_id)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: foundingCount } = await (supabase as any)
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_founding_member', true)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Founders Hub
            <span className="text-xs font-normal text-zinc-400">{foundingCount ?? 0} founding members</span>
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Grant access to someone on the Members page (the flag icon next to their role). Triage ideas and
            topics here — setting a status is what a founding member sees reflected on their submission.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {(suggestions ?? []).length === 0 ? (
            <p className="p-6 text-sm text-zinc-400 text-center">Nothing submitted yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="py-2.5 pr-4 pl-4 font-semibold">Title</th>
                  <th className="py-2.5 pr-4 font-semibold">Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Votes</th>
                  <th className="py-2.5 pr-4 font-semibold">By</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(suggestions ?? []).map((s: any) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 pr-4 pl-4 font-medium text-zinc-700 max-w-xs truncate">{s.title}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs capitalize">{s.type}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{s.founder_suggestion_votes?.length ?? 0}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{s.profiles?.full_name ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusSelect suggestionId={s.id} status={s.status} setStatus={setStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
