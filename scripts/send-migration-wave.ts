/**
 * send-migration-wave.ts
 * =======================
 * Sends the "claim your account" migration email to one wave of the phased
 * rollout (see scripts/data/talk_migration_roster.csv for wave assignments).
 *
 * For each member it re-checks LIVE Supabase status before sending — the
 * spreadsheet's sign_in_count/last_sign_in_at is carried over from the old
 * talktalent.com system and does NOT tell us who has claimed on the new
 * platform, so we never trust it for send/skip decisions. The live check
 * (generateLink) is the same mechanism app/api/invite/route.ts uses.
 *
 * Prerequisites:
 *   1. scripts/data/talk_migration_roster.csv must exist (email, first_name,
 *      last_name, wave, planned_send_date columns).
 *   2. Copy .env.local vars into your shell, or create scripts/.env with:
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *        RESEND_API_KEY=...
 *        FROM_EMAIL=...
 *        NEXT_PUBLIC_SITE_URL=...
 *
 * Run:
 *   npx tsx scripts/send-migration-wave.ts --wave=1              (dry run by default)
 *   npx tsx scripts/send-migration-wave.ts --wave=1 --send        (actually sends)
 *   npx tsx scripts/send-migration-wave.ts --wave=1 --send --limit=25   (test on first 25)
 *
 * Safe to re-run: anyone who already has a real sign-in on the new platform
 * (last_sign_in_at from the live Supabase check) is skipped automatically,
 * and everything is logged to scripts/data/wave-<N>-log-<timestamp>.csv so a
 * re-run's outcomes are easy to diff against the previous attempt.
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { buildClaimEmail, buildClaimText } from '../lib/email'

// ---------------------------------------------------------------------------
// Config / args
// ---------------------------------------------------------------------------

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY!
const FROM_EMAIL       = process.env.FROM_EMAIL ?? 'TALK Community <hello@talktalent.com>'
const REPLY_TO_EMAIL   = process.env.REPLY_TO_EMAIL ?? 'bill@talktalent.com'
const SITE_ORIGIN      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.talktalent.com'
const REDIRECT_TO      = `${SITE_ORIGIN}/auth/reset-password?claim=1`

const argWave  = process.argv.find(a => a.startsWith('--wave='))
const argCsv   = process.argv.find(a => a.startsWith('--csv='))
const argLimit = process.argv.find(a => a.startsWith('--limit='))
const DO_SEND  = process.argv.includes('--send')

const WAVE = argWave ? parseInt(argWave.split('=')[1], 10) : NaN
const CSV_PATH = argCsv
  ? path.resolve(argCsv.split('=')[1])
  : path.join(__dirname, 'data', 'talk_migration_roster.csv')
const LIMIT = argLimit ? parseInt(argLimit.split('=')[1], 10) : Infinity

if (!WAVE || WAVE < 1 || WAVE > 4) {
  console.error('❌  Pass --wave=1 (through 4). Example: npx tsx scripts/send-migration-wave.ts --wave=1')
  process.exit(1)
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (DO_SEND && !RESEND_API_KEY) {
  console.error('❌  Missing RESEND_API_KEY (required with --send)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const resend = DO_SEND ? new Resend(RESEND_API_KEY) : null

// ---------------------------------------------------------------------------
// CSV parsing (same minimal parser used across scripts/*.ts)
// ---------------------------------------------------------------------------

function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = []
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) })
    let headers: string[] = []
    let isFirst = true
    rl.on('line', (raw) => {
      const cols = raw.split(',')
      if (isFirst) { headers = cols.map(h => h.replace(/^﻿/, '').trim()); isFirst = false; return }
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim() })
      rows.push(row)
    })
    rl.on('close', () => resolve(rows))
    rl.on('error', reject)
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type Outcome = 'claim_sent' | 'already_active' | 'not_found' | 'error' | 'dry_run'

async function main() {
  console.log(`🚀  TALK Migration — Wave ${WAVE}  (${DO_SEND ? 'LIVE SEND' : 'DRY RUN — no emails will be sent'})`)
  console.log('   Roster CSV:', CSV_PATH)

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  Not found: ${CSV_PATH}`)
    process.exit(1)
  }

  const rows = await parseCSV(CSV_PATH)
  const wave = rows.filter(r => parseInt(r.wave, 10) === WAVE).slice(0, LIMIT)
  console.log(`   ${wave.length} members in wave ${WAVE}${LIMIT !== Infinity ? ` (limited to first ${LIMIT})` : ''}\n`)

  const log: { email: string; outcome: Outcome; detail: string }[] = []
  let sent = 0, alreadyActive = 0, notFound = 0, errors = 0

  for (const [i, member] of wave.entries()) {
    const email = member.email?.toLowerCase().trim()
    if (!email) continue

    process.stdout.write(`   [${i + 1}/${wave.length}] ${email} … `)

    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: REDIRECT_TO },
      })

      if (linkErr || !linkData?.properties?.action_link) {
        console.log('not found — skipping (no account exists yet)')
        log.push({ email, outcome: 'not_found', detail: linkErr?.message ?? '' })
        notFound++
        continue
      }

      if (linkData.user?.last_sign_in_at) {
        console.log('already active — skipping')
        log.push({ email, outcome: 'already_active', detail: linkData.user.last_sign_in_at })
        alreadyActive++
        continue
      }

      const firstName = member.first_name || linkData.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
      const claimUrl = `${REDIRECT_TO}&token_hash=${linkData.properties.hashed_token}&type=recovery`

      if (!DO_SEND) {
        console.log('would send claim email (dry run)')
        log.push({ email, outcome: 'dry_run', detail: claimUrl })
      } else {
        await resend!.emails.send({
          from: FROM_EMAIL,
          replyTo: REPLY_TO_EMAIL,
          to: email,
          subject: 'Welcome to the new TALK — claim your account',
          html: buildClaimEmail({ toFirstName: firstName, claimUrl }),
          text: buildClaimText({ toFirstName: firstName, claimUrl }),
        })
        console.log('sent')
        log.push({ email, outcome: 'claim_sent', detail: '' })
        sent++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`error: ${msg}`)
      log.push({ email, outcome: 'error', detail: msg })
      errors++
    }

    await sleep(150) // gentle rate limiting, matches migrate-legacy.ts
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logPath = path.join(__dirname, 'data', `wave-${WAVE}-log-${stamp}.csv`)
  const csvOut = ['email,outcome,detail', ...log.map(l => `${l.email},${l.outcome},"${(l.detail ?? '').replace(/"/g, '""')}"`)].join('\n')
  fs.writeFileSync(logPath, csvOut)

  console.log(`\n✅  Wave ${WAVE} ${DO_SEND ? 'send' : 'dry run'} complete`)
  if (DO_SEND) console.log(`   Sent:            ${sent}`)
  console.log(`   Already active:  ${alreadyActive}`)
  console.log(`   Not found:       ${notFound}`)
  console.log(`   Errors:          ${errors}`)
  console.log(`   Log written to:  ${logPath}\n`)

  if (!DO_SEND) {
    console.log('This was a dry run — no emails were sent. Re-run with --send to actually send this wave.')
  }
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err)
  process.exit(1)
})
