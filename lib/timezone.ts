// Timezone helpers for events — dependency-free, DST-aware via Intl.
//
// event_date/end_date are stored as absolute UTC instants (timestamptz). An
// event also carries an IANA `timezone` (the zone the organizer scheduled it
// in) so we can render "2:00 PM EDT" and convert to each viewer's local time.

export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'America/Halifax', label: 'Atlantic (AT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'UTC', label: 'UTC' },
]

// Offset in ms between a zone's wall-clock time and UTC at a given instant.
// (Positive means the zone is behind UTC, i.e. wall = utc + offset... we return
// wallAsUTC - actualUTC, used by the conversion below.)
function tzOffsetMs(timeZone: string, atUTC: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const p of dtf.formatToParts(new Date(atUTC))) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10)
  }
  const hour = map.hour === 24 ? 0 : map.hour // some engines emit 24 for midnight
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUTC - atUTC
}

// Convert a naive "YYYY-MM-DDTHH:mm" wall time (what a datetime-local input
// gives) interpreted in `timeZone` into the correct UTC Date.
export function zonedWallTimeToUTC(naive: string, timeZone: string): Date {
  const [datePart, timePart = '00:00'] = naive.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  // Correct by the offset at the guess, then re-check once for DST boundaries.
  const offset1 = tzOffsetMs(timeZone, guess)
  let utc = guess - offset1
  const offset2 = tzOffsetMs(timeZone, utc)
  if (offset2 !== offset1) utc = guess - offset2
  return new Date(utc)
}

// The short zone name (e.g. "EDT", "PST") for a zone at a given instant.
export function shortZoneName(timeZone: string, instant: string | Date = new Date()): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(date)
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone
}

// Format a UTC instant in a specific zone, e.g. "Saturday, August 15, 2026 at
// 2:00 PM EDT". Override parts via opts.
export function formatInZone(
  instant: string | Date,
  timeZone: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...opts,
  }).format(date)
}

// Render a UTC instant as a "YYYY-MM-DDTHH:mm" wall-clock string in the given
// zone — the value a <input type="datetime-local"> expects when editing.
export function utcToZonedInputValue(instant: string | Date, timeZone: string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const m: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)) {
    if (p.type !== 'literal') m[p.type] = p.value
  }
  const hh = m.hour === '24' ? '00' : m.hour
  return `${m.year}-${m.month}-${m.day}T${hh}:${m.minute}`
}

// The viewer's own IANA zone (browser). Falls back to UTC.
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
