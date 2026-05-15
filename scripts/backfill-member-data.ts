/**
 * backfill-member-data.ts
 * =======================
 * Reads the new TALK Members CSV (which has chapter + board-member data)
 * and backfills existing approved profiles with:
 *   • role = 'board_member'  (where Board? == 'board_member')
 *   • chapter_memberships    (matched by chapter name → chapter id)
 *
 * Match priority: email first, then linkedin_url.
 *
 * Prerequisites:
 *   Copy the CSV to scripts/data/talk_members_v2.csv  (or pass --csv=<path>)
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-member-data.ts
 *
 * Safe to re-run (chapter_memberships upserted, role only upgraded never downgraded).
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Accept --csv=<path> or fall back to default
const csvArgMatch = process.argv.find(a => a.startsWith('--csv='))
const CSV_PATH = csvArgMatch
  ? path.resolve(csvArgMatch.split('=')[1])
  : path.join(__dirname, 'data', 'talk_members_v2.csv')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌  CSV not found at: ${CSV_PATH}`)
  console.error('   Copy the TALK Members CSV to scripts/data/talk_members_v2.csv')
  console.error('   or pass --csv=/path/to/file.csv')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = []
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) })
    let headers: string[] = []
    let isFirst = true

    rl.on('line', (raw) => {
      const cols = splitCSVLine(raw)
      if (isFirst) {
        headers = cols.map(h => h.replace(/^﻿/, '').trim()) // strip BOM
        isFirst = false
        return
      }
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i]?.trim() ?? '' })
      rows.push(row)
    })

    rl.on('close', () => resolve(rows))
    rl.on('error', reject)
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ---------------------------------------------------------------------------
// Build chapter name → id map
// DB chapter names are like "NY · New York City" — we extract the city part
// and also keep the full name for direct matches (DC, National, International)
// ---------------------------------------------------------------------------

async function buildChapterMap(): Promise<Map<string, string>> {
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, name')

  if (error || !chapters) {
    console.error('❌  Could not fetch chapters:', error?.message)
    process.exit(1)
  }

  const map = new Map<string, string>()
  for (const c of chapters) {
    const name: string = c.name
    // "NY · New York City" → "New York City"
    const cityPart = name.includes(' · ') ? name.split(' · ')[1] : name
    map.set(cityPart.toLowerCase(), c.id)
    // Also map full name for anything without a prefix
    map.set(name.toLowerCase(), c.id)
  }
  return map
}

// ---------------------------------------------------------------------------
// Normalize a linkedin URL to a canonical form for matching
// e.g. trailing slash, http→https, www variants
// ---------------------------------------------------------------------------

function normLinkedin(url: string | null | undefined): string {
  if (!url?.trim()) return ''
  return url.trim()
    .toLowerCase()
    .replace(/^http:/, 'https:')
    .replace('://www.', '://')
    .replace(/\/$/, '')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀  TALK Member Data Backfill')
  console.log('   CSV:', CSV_PATH)
  console.log('   Supabase:', SUPABASE_URL)
  console.log()

  // 1. Load CSV
  console.log('📥  Loading CSV…')
  const csvRows = await parseCSV(CSV_PATH)
  console.log(`   ${csvRows.length} rows parsed`)

  // Build lookup maps from CSV — index ALL email columns for maximum match rate
  const csvByEmail  = new Map<string, Record<string, string>>()
  const csvByLinkedin = new Map<string, Record<string, string>>()
  for (const row of csvRows) {
    // Check all three email columns: user_email, Professional Email, Personal Email
    for (const col of ['user_email', 'Professional Email', 'Personal Email']) {
      const email = row[col]?.toLowerCase()
      if (email) csvByEmail.set(email, row)
    }
    const li = normLinkedin(row['linkedin_url'])
    if (li) csvByLinkedin.set(li, row)
  }
  console.log(`   Indexed ${csvByEmail.size} unique emails, ${csvByLinkedin.size} linkedin URLs`)

  // 2. Fetch all approved profiles
  console.log('\n👥  Fetching approved profiles from Supabase…')
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, email, linkedin_url, role')
    .eq('status', 'approved')

  if (profErr || !profiles) {
    console.error('❌  Could not fetch profiles:', profErr?.message)
    process.exit(1)
  }
  console.log(`   ${profiles.length} approved profiles found`)

  // 3. Build chapter map
  console.log('\n📂  Building chapter name map…')
  const chapterMap = await buildChapterMap()
  console.log(`   ${chapterMap.size} chapter name entries`)

  // 4. Process each profile
  console.log('\n⚙️   Processing profiles…')
  let roleUpdates = 0, chapterInserts = 0, skipped = 0, notMatched = 0

  for (const profile of profiles) {
    // Try to match CSV row
    const email = profile.email?.toLowerCase()
    const li    = normLinkedin(profile.linkedin_url)

    let csvRow = (email && csvByEmail.get(email)) ?? (li && csvByLinkedin.get(li)) ?? null

    if (!csvRow) {
      notMatched++
      continue
    }

    const isBoard   = csvRow['Board?']?.trim() === 'board_member'
    const chapterName = csvRow['TALK Chapter']?.trim() ?? ''
    const chapterId = chapterName ? (chapterMap.get(chapterName.toLowerCase()) ?? null) : null

    let touched = false

    // Update role to board_member if needed (only upgrade, never downgrade)
    if (isBoard && profile.role !== 'board_member') {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'board_member' })
        .eq('id', profile.id)

      if (error) {
        console.error(`   ⚠️  Role update failed for ${profile.id}: ${error.message}`)
      } else {
        roleUpdates++
        touched = true
      }
    }

    // Upsert chapter membership
    if (chapterId) {
      const { error } = await supabase
        .from('chapter_memberships')
        .upsert(
          { user_id: profile.id, chapter_id: chapterId },
          { onConflict: 'user_id,chapter_id' }
        )

      if (error) {
        console.error(`   ⚠️  Chapter upsert failed for ${profile.id}: ${error.message}`)
      } else {
        chapterInserts++
        touched = true
      }
    }

    if (!touched) skipped++

    await sleep(30) // gentle rate limiting
  }

  // 5. Summary
  console.log('\n✅  Done!')
  console.log(`   Profiles matched to CSV: ${profiles.length - notMatched} / ${profiles.length}`)
  console.log(`   Not matched in CSV:      ${notMatched}`)
  console.log(`   Role → board_member:     ${roleUpdates}`)
  console.log(`   Chapter memberships set: ${chapterInserts}`)
  console.log(`   Already correct:         ${skipped}`)
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
