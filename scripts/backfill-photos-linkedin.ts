/**
 * backfill-photos-linkedin.ts
 * ============================
 * Backfills linkedin_url and avatar_url for all approved profiles.
 *
 * Match chain:
 *   profile.email
 *     → CSV (talk_members_v2.csv) → CSV.linkedin_url  ← written to profiles.linkedin_url
 *     → legacy_member_staging.linkedin_url → staging.avatar_url
 *       → download from S3 → upload to Supabase avatars bucket
 *       → permanent URL written to profiles.avatar_url
 *
 * ⚠️  The S3 signed avatar URLs in staging expire ~May 22 — run this ASAP.
 *
 * Safe to re-run: skips profiles that already have both fields set.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/backfill-photos-linkedin.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CSV_PATH         = path.join(__dirname, 'data', 'talk_members_v2.csv')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('❌  Missing env vars'); process.exit(1) }
if (!fs.existsSync(CSV_PATH)) { console.error('❌  CSV not found:', CSV_PATH); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function normLinkedin(url: string | null | undefined): string {
  if (!url?.trim()) return ''
  return url.trim().toLowerCase()
    .replace(/^http:/, 'https:')
    .replace('://www.', '://')
    .replace(/\/$/, '')
}

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀  Backfill photos + LinkedIn URLs')
  console.log()

  // 1. Load CSV → email → linkedin_url map
  console.log('📥  Loading CSV…')
  const csvRows = await parseCSV(CSV_PATH)
  const csvByEmail = new Map<string, string>() // email → linkedin_url
  for (const row of csvRows) {
    const li = row['linkedin_url']?.trim()
    if (!li) continue
    for (const col of ['user_email', 'Professional Email', 'Personal Email']) {
      const email = row[col]?.toLowerCase().trim()
      if (email) csvByEmail.set(email, li)
    }
  }
  console.log(`   ${csvByEmail.size} email→linkedin mappings from CSV`)

  // 2. Load legacy_member_staging → linkedin_url → avatar_url map
  console.log('\n📦  Loading staging avatar URLs…')
  // Fetch in pages (10k+ rows)
  const stagingMap = new Map<string, string>() // norm(linkedin) → avatar_url
  let stagingPage = 0
  while (true) {
    const { data } = await supabase
      .from('legacy_member_staging')
      .select('linkedin_url, avatar_url')
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .range(stagingPage * 1000, stagingPage * 1000 + 999)
    if (!data || data.length === 0) break
    for (const row of data) {
      const norm = normLinkedin(row.linkedin_url)
      if (norm && row.avatar_url) stagingMap.set(norm, row.avatar_url)
    }
    stagingPage++
    if (data.length < 1000) break
  }
  console.log(`   ${stagingMap.size} linkedin→avatar mappings from staging`)

  // 3. Fetch all approved profiles that need work
  console.log('\n👥  Fetching profiles that need backfill…')
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, linkedin_url, avatar_url')
    .eq('status', 'approved')
    .limit(1000)

  const needWork = (profiles ?? []).filter(p => !p.linkedin_url || !p.avatar_url)
  console.log(`   ${needWork.length} profiles need linkedin_url or avatar_url`)

  // 4. Process each profile
  let linkedinSet = 0, avatarSet = 0, avatarFailed = 0

  for (let i = 0; i < needWork.length; i++) {
    const profile = needWork[i]
    const email = profile.email?.toLowerCase().trim() ?? ''

    // Resolve linkedin_url
    const csvLinkedin = csvByEmail.get(email) ?? null
    const linkedinUrl = profile.linkedin_url || csvLinkedin

    // Resolve avatar from staging via linkedin
    const normLi = normLinkedin(linkedinUrl)
    const stagingAvatarUrl = normLi ? stagingMap.get(normLi) : null

    const updates: Record<string, string | null> = {}

    // --- LinkedIn ---
    if (!profile.linkedin_url && csvLinkedin) {
      updates.linkedin_url = csvLinkedin
      linkedinSet++
    }

    // --- Avatar: download from S3 → upload to Supabase ---
    if (!profile.avatar_url && stagingAvatarUrl) {
      try {
        const res = await fetch(stagingAvatarUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const contentType = res.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg'
        const buffer = Buffer.from(await res.arrayBuffer())

        const storagePath = `${profile.id}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(storagePath, buffer, {
            contentType,
            upsert: true,
          })

        if (upErr) throw new Error(upErr.message)

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath)
        updates.avatar_url = urlData.publicUrl
        avatarSet++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        // Don't spam — only log first few failures
        if (avatarFailed < 5) console.error(`   ⚠️  Avatar failed for ${profile.id}: ${msg}`)
        avatarFailed++
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', profile.id)
    }

    if ((i + 1) % 50 === 0) process.stdout.write(`   ${i + 1}/${needWork.length}…\r`)
    await sleep(80) // gentle rate limiting
  }

  console.log(`\n\n✅  Done!`)
  console.log(`   LinkedIn URLs set: ${linkedinSet}`)
  console.log(`   Avatars uploaded:  ${avatarSet}`)
  console.log(`   Avatar failures:   ${avatarFailed}`)
}

main().catch(err => { console.error('\n❌  Fatal:', err); process.exit(1) })
