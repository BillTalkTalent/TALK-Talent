/**
 * fix-forum-authors.ts
 * ====================
 * The original migration incorrectly assigned all legacy forum topics
 * to one member because the CSV has no legacy_user_id column — the
 * lookup key was always "" and resolved to the first author in the map.
 *
 * This script re-links every topic to its correct author by:
 *   1. Reading the original CSV (author_email per topic)
 *   2. Fetching all forum_topics from the DB
 *   3. Matching CSV rows → DB topics by title (trimmed)
 *   4. Looking up author profile by email
 *   5. Updating author_id on each topic
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/fix-forum-authors.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const POSTS_CSV        = path.join(__dirname, 'data', 'talk_forum_posts.csv')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('❌  Missing env vars'); process.exit(1) }
if (!fs.existsSync(POSTS_CSV)) { console.error('❌  CSV not found:', POSTS_CSV); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = []
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) })
    let headers: string[] = []
    let isFirst = true
    rl.on('line', (raw) => {
      const cols = splitCSVLine(raw)
      if (isFirst) { headers = cols.map(h => h.replace(/^﻿/, '').trim()); isFirst = false; return }
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i]?.trim() ?? '' })
      rows.push(row)
    })
    rl.on('close', () => resolve(rows))
    rl.on('error', reject)
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []; let cur = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += ch
  }
  result.push(cur)
  return result
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('🔧  Fix forum topic authors')

  // 1. Load CSV
  console.log('\n📥  Loading CSV…')
  const csvRows = await parseCSV(POSTS_CSV)
  console.log(`   ${csvRows.length} rows`)

  // Build title → { email, name } map from CSV (use first match per title)
  const csvByTitle = new Map<string, { email: string; firstName: string; lastName: string }>()
  for (const row of csvRows) {
    const title = (row['subject'] ?? '').trim().slice(0, 500)
    if (title && !csvByTitle.has(title)) {
      csvByTitle.set(title, {
        email:     (row['author_email'] ?? '').toLowerCase().trim(),
        firstName: row['author_first_name'] ?? '',
        lastName:  row['author_last_name'] ?? '',
      })
    }
  }
  console.log(`   ${csvByTitle.size} unique titles indexed`)

  // 2. Fetch all existing profiles (email → id)
  console.log('\n👥  Fetching profiles…')
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').limit(20000)
  const profileByEmail = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) profileByEmail.set(p.email.toLowerCase().trim(), p.id)
  }
  console.log(`   ${profileByEmail.size} profiles indexed`)

  // 3. Fetch all forum topics
  console.log('\n💬  Fetching forum topics…')
  const { data: topics } = await supabase
    .from('forum_topics')
    .select('id, title, author_id')
    .limit(2000)
  console.log(`   ${topics?.length} topics`)

  // 4. Match and update
  console.log('\n⚙️   Matching and updating authors…')
  let updated = 0, noMatch = 0, noProfile = 0, alreadyCorrect = 0

  for (const topic of topics ?? []) {
    const title = (topic.title ?? '').trim().slice(0, 500)
    const csvAuthor = csvByTitle.get(title)

    if (!csvAuthor) {
      noMatch++
      continue
    }

    const profileId = csvAuthor.email ? profileByEmail.get(csvAuthor.email) : undefined

    if (!profileId) {
      // Author hasn't signed up yet — set null so it shows as anonymous
      if (topic.author_id === null) { alreadyCorrect++; continue }
      await supabase.from('forum_topics').update({ author_id: null }).eq('id', topic.id)
      updated++
      continue
    }

    if (topic.author_id === profileId) { alreadyCorrect++; continue }

    const { error } = await supabase
      .from('forum_topics')
      .update({ author_id: profileId })
      .eq('id', topic.id)

    if (error) {
      console.error(`   ⚠️  Update failed for "${title}": ${error.message}`)
    } else {
      updated++
    }

    await sleep(20)
  }

  console.log('\n✅  Done!')
  console.log(`   Updated:         ${updated}`)
  console.log(`   Already correct: ${alreadyCorrect}`)
  console.log(`   No CSV match:    ${noMatch}`)
  console.log(`   No profile:      ${noProfile}`)

  // 5. Show author distribution after fix
  const { data: after } = await supabase
    .from('forum_topics')
    .select('author_id, profiles!forum_topics_author_id_fkey(full_name)')
    .limit(1000) as { data: { author_id: string; profiles: { full_name: string } | null }[] | null }

  const counts: Record<string, number> = {}
  for (const t of after ?? []) {
    const name = t.profiles?.full_name ?? '(anonymous)'
    counts[name] = (counts[name] ?? 0) + 1
  }
  console.log('\n📊  Author distribution (top 10):')
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([name, n]) => console.log(`   ${n.toString().padStart(4)}  ${name}`))
}

main().catch(err => { console.error('\n❌  Fatal:', err); process.exit(1) })
