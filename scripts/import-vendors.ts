/**
 * import-vendors.ts
 * =================
 * Reads the scraped vendor JSON (/Users/billtextio/Downloads/talktalent_vendors.json)
 * and inserts all 482 vendors into the Supabase `vendors` table.
 *
 * Idempotent: fetches existing vendor names upfront and skips duplicates.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/import-vendors.ts [--json=/path/to/vendors.json]
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const jsonArgMatch = process.argv.find(a => a.startsWith('--json='))
const JSON_PATH = jsonArgMatch
  ? path.resolve(jsonArgMatch.split('=')[1])
  : path.join(process.env.HOME ?? '', 'Downloads', 'talktalent_vendors.json')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!fs.existsSync(JSON_PATH)) {
  console.error(`❌  JSON not found at: ${JSON_PATH}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrapedVendor {
  id: string
  name: string
  slug: string
  description: string
  tagline: string
  primary_category: string
  categories: string[]
  logo_url: string
  website_url: string
  overall_rating: number | null
  vendor_product_profile_id: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function pickCategory(v: ScrapedVendor): string | null {
  // primary_category is only populated for ~14 vendors; fall back to categories[0]
  if (v.primary_category?.trim()) return v.primary_category.trim()
  if (v.categories?.length) return v.categories[0]
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚀  TALK Vendor Import')
  console.log('   JSON:', JSON_PATH)
  console.log('   Supabase:', SUPABASE_URL)
  console.log()

  // 1. Load JSON
  console.log('📥  Loading vendor JSON…')
  const raw = fs.readFileSync(JSON_PATH, 'utf-8')
  const vendors: ScrapedVendor[] = JSON.parse(raw)
  console.log(`   ${vendors.length} vendors loaded`)

  // 2. Fetch existing vendor names to skip duplicates
  console.log('\n🔍  Fetching existing vendors…')
  const { data: existing, error: existErr } = await supabase
    .from('vendors')
    .select('name')
    .limit(10000)

  if (existErr) {
    console.error('❌  Could not fetch existing vendors:', existErr.message)
    process.exit(1)
  }

  const existingNames = new Set((existing ?? []).map((v: { name: string }) => v.name.toLowerCase()))
  console.log(`   ${existingNames.size} vendors already in DB`)

  // 3. Filter to only new vendors
  const newVendors = vendors.filter(v => !existingNames.has(v.name.toLowerCase()))
  console.log(`   ${newVendors.length} to import, ${vendors.length - newVendors.length} skipped (already exist)`)

  if (newVendors.length === 0) {
    console.log('\n✅  Nothing to import — all vendors already exist.')
    return
  }

  // 4. Build insert rows (core columns only — no migration required)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Record<string, any>[] = newVendors.map(v => ({
    name:        v.name,
    description: v.description || null,
    website:     v.website_url || null,
    logo_url:    v.logo_url || null,
    category:    pickCategory(v),
    is_featured: false,
  }))

  // 5. Insert in batches of 50
  const BATCH = 50
  let inserted = 0, errors = 0

  console.log(`\n⚙️   Inserting in batches of ${BATCH}…`)
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('vendors')
      .insert(batch)

    if (error) {
      console.error(`   ⚠️  Batch ${Math.floor(i / BATCH) + 1} error: ${error.message}`)
      errors += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`   ${inserted} / ${rows.length}…\r`)
    }

    await sleep(80) // gentle rate limiting
  }

  console.log(`\n\n✅  Done!`)
  console.log(`   Inserted:  ${inserted}`)
  console.log(`   Errors:    ${errors}`)
  console.log(`   Skipped:   ${vendors.length - newVendors.length} (already existed)`)
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
