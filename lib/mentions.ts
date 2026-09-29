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
