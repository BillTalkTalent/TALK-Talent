// "Missed last week's discussion?" teaser — the most recent past event with
// a recording attached. Windowed to 10 days so a stale recording doesn't
// linger in the newsletter for weeks if nothing new has been posted since.
// Members-only for now: links to the event's own detail page rather than
// the raw recording URL, since that page already gates full event content
// (including the recording) behind sign-in — a public teaser is a later,
// separate decision, not something to default into here.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any

export type RecordingTeaser = {
  id: string
  title: string
  event_date: string
}

export async function getLastWeekRecordingForNewsletter(adminDb: AdminDb): Promise<RecordingTeaser | null> {
  const now = new Date().toISOString()
  const windowStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await adminDb
    .from('events')
    .select('id, title, event_date')
    .eq('status', 'published')
    .eq('is_test', false)
    .not('recording_url', 'is', null)
    .lt('event_date', now)
    .gte('event_date', windowStart)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

export function buildRecordingBlock(recording: RecordingTeaser | null, origin: string): string {
  if (!recording) return ''

  const link = `${origin}/events/${recording.id}`
  const dateStr = new Date(recording.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return `
  <!-- Last week's recording — sits right after the masthead sponsor, ahead
       of what's coming up next, so the newsletter reads "catch up, then
       look ahead." -->
  <tr><td style="background:#fff;padding:8px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#0d9488;text-transform:uppercase;letter-spacing:0.08em;">Missed last week's discussion?</p>
        <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#0F1F35;line-height:1.3;">${recording.title}</p>
        <p style="margin:0 0 14px;font-size:13px;color:#5A7090;">Recorded ${dateStr} &middot; Members-only</p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#0d9488;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px;">Watch the Recording &rarr;</a>
      </td></tr>
    </table>
  </td></tr>`
}
