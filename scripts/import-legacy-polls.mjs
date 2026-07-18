// Import legacy TALK polls (scripts/data/legacy-polls.json) into the new schema.
// Closed polls carry aggregate results in poll_options.legacy_vote_count (the
// old platform exposes no individual votes). Authors/commenters are matched to
// profiles by full_name; unmatched names fall back to author_name text.
// Idempotent: skips any legacy poll whose question already exists.
//
//   DRY=1 node scripts/import-legacy-polls.mjs   # show what would happen
//         node scripts/import-legacy-polls.mjs   # write
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const DRY = process.env.DRY === '1'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { polls } = JSON.parse(fs.readFileSync('scripts/data/legacy-polls.json', 'utf8'))

// Rough relative-age → timestamp (comments show "5 months ago" / "a year ago").
function ageToDate(age) {
  const now = Date.now()
  if (!age) return new Date(now - 240 * 864e5)
  const m = age.match(/(\d+|a|an)\s+(day|week|month|year)/i)
  if (!m) return new Date(now - 240 * 864e5)
  const n = /^\d+$/.test(m[1]) ? parseInt(m[1]) : 1
  const unit = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }[m[2].toLowerCase()]
  return new Date(now - n * unit)
}

// Map the distinct legacy names to profiles by full_name.
const names = new Set()
for (const p of polls) {
  names.add(p.author_name)
  for (const c of p.comments || []) names.add(c.author_name)
}
const nameToId = new Map()
for (const name of names) {
  const { data } = await s.from('profiles').select('id, role').ilike('full_name', name)
  if (data && data.length) {
    // Prefer an admin/board profile if a name collides.
    const pick = data.find((r) => r.role === 'admin' || r.role === 'board_member') || data[0]
    nameToId.set(name, pick.id)
    if (data.length > 1) console.log(`  ⚠︎ "${name}" matched ${data.length} profiles — using ${pick.id}`)
  } else {
    console.log(`  ⚠︎ "${name}" — no profile match, will store as author_name text`)
  }
}

console.log(`\n${polls.length} legacy polls to import${DRY ? ' (DRY RUN)' : ''}\n`)
let created = 0, skipped = 0, commentsAdded = 0

for (const p of polls) {
  // Idempotency: skip if this question already exists as a legacy poll.
  const { data: existing } = await s.from('polls').select('id').eq('question', p.question).eq('is_legacy', true).limit(1)
  if (existing && existing.length) { console.log(`skip (exists): ${p.question.slice(0, 60)}…`); skipped++; continue }

  const createdBy = nameToId.get(p.author_name) ?? null
  // Backdate the poll a bit so it reads as historical.
  const createdAt = (p.comments?.length ? ageToDate(p.comments[p.comments.length - 1].age) : new Date(Date.now() - 240 * 864e5)).toISOString()

  if (DRY) {
    console.log(`WOULD create: "${p.question.slice(0, 60)}…" (${p.status}, ${p.options.length} opts, ${p.comments.length} comments, author=${p.author_name}${createdBy ? '' : ' [unmatched]'})`)
    created++
    continue
  }

  const { data: poll, error: pe } = await s.from('polls').insert({
    question: p.question,
    created_by: createdBy,
    is_multiple_choice: p.is_multiple_choice,
    status: p.status,
    is_legacy: true,
    legacy_id: p.legacy_id,
    legacy_total_votes: p.results_available ? p.total_votes : null,
    created_at: createdAt,
  }).select('id').single()
  if (pe) { console.log(`  ✗ poll insert failed: ${pe.message}`); continue }

  // Options — preserve display order; legacy_vote_count only when results known.
  const optRows = p.options.map((o, i) => {
    const text = typeof o === 'string' ? o : o.text
    const votes = typeof o === 'string' ? null : (p.results_available ? o.votes : null)
    return { poll_id: poll.id, text, sort_order: i, legacy_vote_count: votes }
  })
  const { error: oe } = await s.from('poll_options').insert(optRows)
  if (oe) console.log(`  ✗ options insert failed: ${oe.message}`)

  // Comments
  for (const c of p.comments || []) {
    const { error: ce } = await s.from('poll_comments').insert({
      poll_id: poll.id,
      user_id: nameToId.get(c.author_name) ?? null,
      author_name: nameToId.get(c.author_name) ? null : c.author_name,
      content: c.content,
      is_legacy: true,
      created_at: ageToDate(c.age).toISOString(),
    })
    if (ce) console.log(`  ✗ comment insert failed: ${ce.message}`); else commentsAdded++
  }

  console.log(`✓ ${p.question.slice(0, 60)}…  (${optRows.length} opts, ${p.comments.length} comments)`)
  created++
}

console.log(`\nDone. created=${created} skipped=${skipped} comments=${commentsAdded}`)
