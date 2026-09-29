// Shared @mention format used everywhere a forum post can tag a member:
// literal text `@[Full Name](userId)`, inserted by the mention-textarea's
// typeahead when someone is picked. Plain text, not markup — so it stores
// and round-trips through the same plain-text body columns forum_topics/
// forum_replies already use, no rich-text migration needed.
const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>()
  for (const m of body.matchAll(MENTION_RE)) ids.add(m[2])
  return [...ids]
}

// For plain-text contexts that can't render a link (notification body text,
// email previews) — turns the raw `@[Name](id)` token back into "@Name"
// instead of leaking the userId markup.
export function mentionsToPlainText(body: string): string {
  return body.replace(MENTION_RE, (_match, name) => `@${name}`)
}

export type BodySegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; name: string; userId: string }

// Splits a raw body into plain-text and mention segments for rendering —
// callers turn `mention` segments into a link, e.g. to /members/[userId].
export function splitBodyForRender(body: string): BodySegment[] {
  const segments: BodySegment[] = []
  let lastIndex = 0
  for (const m of body.matchAll(MENTION_RE)) {
    const start = m.index ?? 0
    if (start > lastIndex) segments.push({ type: 'text', value: body.slice(lastIndex, start) })
    segments.push({ type: 'mention', name: m[1], userId: m[2] })
    lastIndex = start + m[0].length
  }
  if (lastIndex < body.length) segments.push({ type: 'text', value: body.slice(lastIndex) })
  return segments
}

export type DisplayMention = { id: string; name: string; start: number; end: number }

// Converts a raw stored body (with `@[Name](id)` tokens) into what the
// mention-textarea shows while composing — plain "@Name" text — plus the
// position of each mention within that display string, so edits can be
// tracked and the raw form reconstructed on change. Inverse of rawFromDisplay.
export function displayFromRaw(body: string): { display: string; mentions: DisplayMention[] } {
  let display = ''
  const mentions: DisplayMention[] = []
  for (const seg of splitBodyForRender(body)) {
    if (seg.type === 'text') {
      display += seg.value
    } else {
      const start = display.length
      const token = `@${seg.name}`
      display += token
      mentions.push({ id: seg.userId, name: seg.name, start, end: start + token.length })
    }
  }
  return { display, mentions }
}

// Inverse of displayFromRaw — rebuilds the raw `@[Name](id)` form from the
// display text plus its tracked mention ranges.
export function rawFromDisplay(display: string, mentions: DisplayMention[]): string {
  const sorted = [...mentions].sort((a, b) => a.start - b.start)
  let raw = ''
  let cursor = 0
  for (const m of sorted) {
    raw += display.slice(cursor, m.start)
    raw += `@[${m.name}](${m.id})`
    cursor = m.end
  }
  raw += display.slice(cursor)
  return raw
}
