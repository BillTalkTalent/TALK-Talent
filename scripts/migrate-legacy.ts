/**
 * migrate-legacy.ts
 * =================
 * One-time script to import legacy talktalent.com data into the new TALK platform.
 *
 * Prerequisites:
 *   1. Run migration 024 in Supabase SQL Editor first.
 *   2. Place the two CSV files from your Downloads folder at:
 *        scripts/data/talk_members.csv
 *        scripts/data/talk_forum_posts.csv
 *   3. Copy .env.local vars into your shell, or create scripts/.env:
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Run:
 *   npx tsx scripts/migrate-legacy.ts
 *
 * The script is fully idempotent — safe to re-run.
 *
 * What it does:
 *   Phase 1  — Load all 10,624 legacy members into legacy_member_staging
 *   Phase 2  — For every forum post author (who has an email), create a
 *              Supabase auth user + approved profile, then back-fill from staging
 *   Phase 3  — Create a "Legacy Import" forum category
 *   Phase 4  — Import 952 forum topics, linked to their authors where possible
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DATA_DIR            = path.join(__dirname, 'data')
const MEMBERS_CSV         = path.join(DATA_DIR, 'talk_members.csv')
const POSTS_CSV           = path.join(DATA_DIR, 'talk_forum_posts.csv')
const LEGACY_CATEGORY_SLUG = 'legacy-national'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields + escaped double-quotes)
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
        headers = cols
        isFirst = false
        return
      }
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function nullIfBlank(s: string | undefined): string | null {
  return s?.trim() || null
}

// ---------------------------------------------------------------------------
// Phase 1 — Load legacy members into staging table
// ---------------------------------------------------------------------------

async function loadMembersStaging() {
  console.log('\n📥  Phase 1: Loading members into legacy_member_staging…')

  if (!fs.existsSync(MEMBERS_CSV)) {
    console.error(`   ❌  Not found: ${MEMBERS_CSV}`)
    console.error('   Copy talk_members.csv from ~/Downloads into scripts/data/')
    process.exit(1)
  }

  const rows = await parseCSV(MEMBERS_CSV)
  console.log(`   Parsed ${rows.length} members from CSV`)

  // Check how many are already loaded (idempotency)
  const { count: existing } = await supabase
    .from('legacy_member_staging')
    .select('*', { count: 'exact', head: true })

  if ((existing ?? 0) >= rows.length) {
    console.log(`   ✅  Already loaded (${existing} rows). Skipping.`)
    return
  }

  // Upsert in batches of 500 — deduplicate on legacy_user_id
  const records = rows.map(r => ({
    legacy_user_id:    nullIfBlank(r.legacy_user_id),
    legacy_profile_id: nullIfBlank(r.profile_id),
    first_name:        nullIfBlank(r.first_name),
    last_name:         nullIfBlank(r.last_name),
    job_title:         nullIfBlank(r.job_title),
    company_name:      nullIfBlank(r.company_name),
    company_industry:  nullIfBlank(r.company_industry),
    company_size:      nullIfBlank(r.company_size),
    ta_level:          nullIfBlank(r.ta_level),
    linkedin_url:      nullIfBlank(r.linkedin_url),
    group_name:        nullIfBlank(r.group_name),
    board_member:      r.board_member === 'true',
    avatar_url:        nullIfBlank(r.avatar_url),
  }))

  let inserted = 0
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500)
    const { error } = await supabase.from('legacy_member_staging').insert(batch)
    if (error) {
      console.error(`   ⚠️  Batch ${i}–${i + batch.length} error:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`   ${inserted}/${records.length} inserted…\r`)
    }
    await sleep(100)
  }
  console.log(`\n   ✅  ${inserted} members loaded into legacy_member_staging`)
}

// ---------------------------------------------------------------------------
// Phase 2 — Create auth users + approved profiles for forum post authors
// ---------------------------------------------------------------------------

async function createAuthorProfiles(posts: Record<string, string>[]) {
  console.log('\n👤  Phase 2: Creating profiles for forum post authors…')

  // Collect unique authors with emails
  const authorMap = new Map<string, { email: string; name: string; legacyUserId: string }>()
  for (const p of posts) {
    const email = nullIfBlank(p.author_email)
    if (!email || authorMap.has(email)) continue
    authorMap.set(email, {
      email,
      name: [p.author_first_name, p.author_last_name].filter(Boolean).join(' '),
      legacyUserId: p.legacy_user_id ?? '',
    })
  }
  console.log(`   Found ${authorMap.size} unique authors with emails`)

  // Map: legacyUserId → new Supabase profile.id
  const legacyToProfileId = new Map<string, string>()
  let created = 0, skipped = 0

  for (const [email, author] of authorMap) {
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      legacyToProfileId.set(author.legacyUserId, existing.id)
      skipped++
      continue
    }

    // Create auth user (email confirmed, no password — they'll use magic link)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: author.name },
    })

    if (authErr || !authData.user) {
      console.error(`   ⚠️  Could not create user ${email}: ${authErr?.message}`)
      continue
    }

    const userId = authData.user.id

    // Update the auto-created profile to approved + back-fill data from staging
    const { data: staging } = await supabase
      .from('legacy_member_staging')
      .select('*')
      .eq('legacy_user_id', author.legacyUserId)
      .single()

    await supabase.from('profiles').update({
      full_name:   author.name || null,
      status:      'approved',
      title:       staging?.job_title   ?? null,
      company:     staging?.company_name ?? null,
      linkedin_url: staging?.linkedin_url ?? null,
      avatar_url:  staging?.avatar_url   ?? null,
    }).eq('id', userId)

    // Mark staging row as matched
    if (staging) {
      await supabase
        .from('legacy_member_staging')
        .update({ matched_profile_id: userId })
        .eq('id', staging.id)
    }

    legacyToProfileId.set(author.legacyUserId, userId)
    created++

    // Throttle to avoid rate limits
    await sleep(150)
  }

  console.log(`   ✅  ${created} profiles created, ${skipped} already existed`)
  return legacyToProfileId
}

// ---------------------------------------------------------------------------
// Phase 3 — Ensure the legacy import forum category exists
// ---------------------------------------------------------------------------

async function ensureLegacyCategory(): Promise<string> {
  console.log('\n📂  Phase 3: Ensuring legacy forum category…')

  const { data: existing } = await supabase
    .from('forum_categories')
    .select('id')
    .eq('slug', LEGACY_CATEGORY_SLUG)
    .single()

  if (existing) {
    console.log(`   ✅  Category already exists (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('forum_categories')
    .insert({
      name:        'National (Legacy)',
      description: 'Imported discussions from the original TALK community at talktalent.com',
      slug:        LEGACY_CATEGORY_SLUG,
      icon:        '📚',
      sort_order:  99,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('   ❌  Failed to create category:', error?.message)
    process.exit(1)
  }

  console.log(`   ✅  Created "National (Legacy)" category (${data.id})`)
  return data.id
}

// ---------------------------------------------------------------------------
// Phase 4 — Import forum topics
// ---------------------------------------------------------------------------

async function importForumTopics(
  posts: Record<string, string>[],
  categoryId: string,
  legacyToProfileId: Map<string, string>
) {
  console.log('\n💬  Phase 4: Importing forum topics…')

  if (!fs.existsSync(POSTS_CSV)) {
    console.error(`   ❌  Not found: ${POSTS_CSV}`)
    process.exit(1)
  }

  // Check how many topics are already imported (idempotency via title+created_at)
  const { count: existing } = await supabase
    .from('forum_topics')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if ((existing ?? 0) >= posts.length) {
    console.log(`   ✅  Already imported (${existing} topics). Skipping.`)
    return
  }

  let imported = 0, failed = 0

  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50)

    const records = batch.map(p => {
      const authorProfileId = legacyToProfileId.get(p.legacy_user_id ?? '') ?? null
      const body = nullIfBlank(p.body_text) ?? ''
      const legacyUrl = nullIfBlank(p.legacy_url)

      return {
        category_id: categoryId,
        author_id:   authorProfileId,  // null if author hasn't been created
        title:       (nullIfBlank(p.subject) ?? '(Untitled)').slice(0, 500),
        body:        legacyUrl
          ? `${body}\n\n---\n*Originally posted on [talktalent.com](${legacyUrl})*`
          : body,
        created_at:  nullIfBlank(p.created_at) ?? new Date().toISOString(),
        updated_at:  nullIfBlank(p.last_activity_at) ?? new Date().toISOString(),
        views:       parseInt(p.comments_count ?? '0', 10) || 0,
      }
    })

    const { error } = await supabase.from('forum_topics').insert(records)
    if (error) {
      console.error(`   ⚠️  Batch ${i}–${i + batch.length} error:`, error.message)
      failed += batch.length
    } else {
      imported += batch.length
      process.stdout.write(`   ${imported}/${posts.length} topics imported…\r`)
    }
    await sleep(100)
  }

  console.log(`\n   ✅  ${imported} topics imported, ${failed} failed`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀  TALK Legacy Migration')
  console.log('   URL:', SUPABASE_URL)

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    console.error(`\n❌  Created scripts/data/ — please copy your CSV files there and re-run.\n`)
    process.exit(1)
  }

  // Phase 1: Members staging
  await loadMembersStaging()

  // Load posts CSV (needed for phases 2 and 4)
  if (!fs.existsSync(POSTS_CSV)) {
    console.error(`\n❌  Not found: ${POSTS_CSV}`)
    console.error('   Copy talk_forum_posts.csv from ~/Downloads into scripts/data/\n')
    process.exit(1)
  }
  const posts = await parseCSV(POSTS_CSV)
  console.log(`\n   Parsed ${posts.length} forum posts from CSV`)

  // Phase 2: Create auth users for forum post authors
  const legacyToProfileId = await createAuthorProfiles(posts)

  // Phase 3: Ensure legacy forum category exists
  const categoryId = await ensureLegacyCategory()

  // Phase 4: Import forum topics
  await importForumTopics(posts, categoryId, legacyToProfileId)

  console.log('\n🎉  Migration complete!\n')
  console.log('Next steps:')
  console.log('  1. Verify in Supabase dashboard → Table Editor → legacy_member_staging')
  console.log('  2. Verify in Table Editor → forum_topics (filter by category "National (Legacy)")')
  console.log('  3. When existing members sign up, call: select public.match_legacy_member(\'<profile_id>\');')
  console.log('     to auto-fill their profile from the staging table.\n')
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
