// Clean up Wave 1 bounces.
// ────────────────────────────────────────────────────────────────────────────
// 1. Pulls delivery status for every Wave 1 send from Resend (last_event).
// 2. Finds the ones that bounced / failed / were suppressed (dead addresses).
// 3. For each dead address, looks for an alternate email for that same member
//    (member_email_aliases) that did NOT bounce → a retry candidate.
// 4. DRY by default: prints the breakdown and writes a CSV, changes nothing.
//    With --send it (a) suppresses every dead address so we never re-hit it,
//    and (b) re-sends the claim email to the best alternate via the hardened
//    production /api/auth/recovery endpoint (which owns the Resend key in prod).
//
//   node scripts/clean-wave1-bounces.mjs            # dry run — analysis only
//   node scripts/clean-wave1-bounces.mjs --send     # suppress dead + retry alts
//
// Needs in .env.local:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                       RESEND_API_KEY  (copy from Vercel → Settings → Env Vars)
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const DO_SEND = process.argv.includes('--send')
const WAVE1_PATH = '/tmp/wave1.txt'
const PROD_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
const OUT_CSV = '/private/tmp/claude-502/-Users-billtextio-claude-projects/ab68b6fa-981a-427f-b40f-637236a7f310/scratchpad/wave1-bounce-report.csv'

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
})) {
  if (!v) { console.error(`❌  Missing ${k} in .env.local`); process.exit(1) }
}
if (!fs.existsSync(WAVE1_PATH)) { console.error(`❌  Not found: ${WAVE1_PATH}`); process.exit(1) }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Wave 1 recipients (the send list).
const wave1 = new Set(
  fs.readFileSync(WAVE1_PATH, 'utf8').split('\n').map((l) => l.trim().toLowerCase()).filter(isEmail),
)
console.log(`Wave 1 recipients: ${wave1.size}`)
console.log(DO_SEND ? '*** LIVE — will suppress dead + send retries ***\n' : '*** DRY RUN — analysis only, no changes ***\n')

// ── 1. Pull delivery status from Resend (paginate all recent emails) ─────────
const DEAD_EVENTS = new Set(['bounced', 'failed', 'suppressed'])
const statusByAddr = new Map() // addr -> last_event (for wave1 addrs only)
let cursor
let pages = 0
while (pages < 100) {
  const { data, error } = await resend.emails.list(cursor ? { limit: 100, after: cursor } : { limit: 100 })
  if (error) { console.error('❌  Resend list error:', error); process.exit(1) }
  const rows = data?.data ?? []
  if (rows.length === 0) break
  for (const e of rows) {
    const to = (e.to?.[0] ?? '').toLowerCase()
    if (wave1.has(to)) {
      // Keep the most "final" status we see; first hit (most recent) wins.
      if (!statusByAddr.has(to)) statusByAddr.set(to, e.last_event)
    }
  }
  pages++
  if (!data?.has_more) break
  cursor = rows[rows.length - 1].id
}
console.log(`Matched ${statusByAddr.size}/${wave1.size} Wave 1 sends in Resend (${pages} page(s) scanned).`)

const dead = [...statusByAddr.entries()].filter(([, ev]) => DEAD_EVENTS.has(ev)).map(([a]) => a)
const deadSet = new Set(dead)
console.log(`Bounced / failed / suppressed: ${dead.length}\n`)

if (dead.length === 0) {
  console.log('No dead addresses to clean. Done.')
  process.exit(0)
}

// ── 2. Resolve an alternate address for each dead one via member_email_aliases ─
// alias table: { alias_email (pk), primary_email }. Build the full address
// cluster for the member and pick a candidate that did not itself bounce.
async function alternatesFor(addr) {
  const cluster = new Set([addr])
  // addr as an alias → its primary; addr as a primary → its aliases
  const [{ data: asAlias }, { data: asPrimary }] = await Promise.all([
    admin.from('member_email_aliases').select('primary_email').eq('alias_email', addr),
    admin.from('member_email_aliases').select('alias_email').eq('primary_email', addr),
  ])
  const primary = asAlias?.[0]?.primary_email ?? addr
  cluster.add(primary)
  for (const r of asPrimary ?? []) cluster.add(r.alias_email)
  if (primary !== addr) {
    const { data: siblings } = await admin
      .from('member_email_aliases').select('alias_email').eq('primary_email', primary)
    for (const r of siblings ?? []) cluster.add(r.alias_email)
  }
  return [...cluster]
    .map((e) => e.toLowerCase())
    .filter((e) => e !== addr && isEmail(e) && !deadSet.has(e))
}

const report = [] // { dead, status, alternate, action }
let retryable = 0, noAlt = 0
for (const addr of dead) {
  const alts = await alternatesFor(addr)
  const alternate = alts[0] ?? ''
  if (alternate) retryable++; else noAlt++
  report.push({ dead: addr, status: statusByAddr.get(addr), alternate, action: alternate ? 'retry' : 'suppress-only' })
}

console.log(`Dead with a usable alternate email (retry):  ${retryable}`)
console.log(`Dead with NO alternate (suppress only):      ${noAlt}\n`)

fs.writeFileSync(
  OUT_CSV,
  ['dead_email,status,alternate_email,action', ...report.map((r) => `${r.dead},${r.status},${r.alternate},${r.action}`)].join('\n'),
)
console.log(`Report written: ${OUT_CSV}\n`)

// Preview
for (const r of report) {
  console.log(`  ${r.status.padEnd(11)} ${r.dead}${r.alternate ? `  →  retry ${r.alternate}` : '  →  no alternate'}`)
}

if (!DO_SEND) {
  console.log('\nDry run complete — nothing changed. Re-run with --send to suppress dead + send retries.')
  process.exit(0)
}

// ── 3. Suppress every dead address, then retry the alternates ────────────────
console.log('\nSuppressing dead addresses…')
const { error: supErr } = await admin
  .from('email_unsubscribes')
  .upsert(dead.map((email) => ({ email })), { onConflict: 'email', ignoreDuplicates: true })
if (supErr) console.error('  suppress error:', supErr.message)
else console.log(`  suppressed ${dead.length} address(es).`)

console.log('\nSending retries to alternates…')
let sent = 0, failed = 0
for (const r of report.filter((x) => x.alternate)) {
  try {
    const res = await fetch(`${PROD_ORIGIN}/api/auth/recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.alternate, mode: 'claim' }),
    })
    if (res.ok) { sent++; console.log(`  ✓ ${r.alternate}`) }
    else { failed++; console.log(`  ✗ ${r.alternate} (${res.status})`) }
  } catch (e) {
    failed++; console.log(`  ✗ ${r.alternate} (${e.message})`)
  }
  await sleep(400)
}
console.log(`\n✅  Done. Suppressed ${dead.length}, retried ${sent}, retry failures ${failed}.`)
