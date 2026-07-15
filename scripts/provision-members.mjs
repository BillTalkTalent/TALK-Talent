// Provision TALK members from /tmp/members_clean.json (produced by prep-members.py).
// Creates approved, claimable accounts with profile pre-filled, auto-joins their chapter,
// and fires match_legacy_member to attach legacy history. Dedups against existing accounts
// across all email variants. Idempotent: skips anyone who already exists.
//
//   LIMIT=10  node scripts/provision-members.mjs        # provision 10 (test batch)
//   DRY=1     node scripts/provision-members.mjs        # show what would happen, no writes
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const LIMIT = parseInt(process.env.LIMIT ?? '10', 10)
const DRY = process.env.DRY === '1'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const members = JSON.parse(fs.readFileSync('/tmp/members_clean.json', 'utf8'))

// Existing accounts (all email variants) so we never create a duplicate person.
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const existing = new Set(list.users.map(u => (u.email || '').toLowerCase()).filter(Boolean))

// Chapter maps for auto-join. Regional chapters are stored "XX · City"; the export
// uses bare city names — so match on exact name first, then on the city suffix.
const { data: chapters } = await admin.from('chapters').select('id,name')
const chapterByName = new Map()
const chapterByCity = new Map()
for (const c of chapters || []) {
  chapterByName.set(c.name.trim().toLowerCase(), c.id)
  if (c.name.includes('·')) chapterByCity.set(c.name.split('·').pop().trim().toLowerCase(), c.id)
}
console.log(`chapters in DB: ${chapters?.length ?? 0} | existing accounts: ${existing.size} | provisionable in file: ${members.length}`)
console.log(DRY ? '*** DRY RUN — no writes ***' : `*** LIVE — provisioning up to ${LIMIT} ***`)

let created = 0, skipped = 0, chapterJoined = 0, legacyMatched = 0, errors = 0
for (const m of members) {
  if (created >= LIMIT) break
  const variants = [m.email, m.prof_email, m.personal_email].filter(Boolean)
  if (variants.some(e => existing.has(e))) { skipped++; continue }

  if (DRY) { console.log(`WOULD create ${m.email} (${m.role}) chapter=${m.chapter ?? '-'}`); created++; continue }

  try {
    const { data: cu, error: cErr } = await admin.auth.admin.createUser({
      email: m.email, email_confirm: true, user_metadata: { full_name: m.full_name },
    })
    if (cErr) {
      if (/already.*registered|exists/i.test(cErr.message)) { skipped++; existing.add(m.email); continue }
      throw cErr
    }
    const id = cu.user.id
    existing.add(m.email)
    await sleep(150) // let the profile trigger settle

    const { error: uErr } = await admin.from('profiles').update({
      full_name: m.full_name, title: m.title, company: m.company,
      // Board members carry over; old-platform admins are capped to member and
      // granted admin manually after review (per launch decision).
      linkedin_url: m.linkedin_url, role: m.role === 'admin' ? 'member' : m.role,
      status: 'approved', has_onboarded: false,
    }).eq('id', id)
    if (uErr) throw uErr

    // Auto-join chapter
    if (m.chapter) {
      const key = m.chapter.trim().toLowerCase()
      const chId = chapterByName.get(key) ?? chapterByCity.get(key)
      if (chId) {
        const { error: chErr } = await admin.from('chapter_memberships').insert({ user_id: id, chapter_id: chId })
        if (!chErr) chapterJoined++
      }
    }
    // Attach legacy history (matches on linkedin_url we just set)
    const { data: matched } = await admin.rpc('match_legacy_member', { p_profile_id: id })
    if (matched === true) legacyMatched++

    created++
    console.log(`  ✓ ${m.email}  role=${m.role}  chapter=${m.chapter ?? '-'}  legacy=${matched === true ? 'linked' : 'no'}`)
  } catch (e) {
    errors++
    console.log(`  ✗ ${m.email}  ERROR: ${e.message}`)
  }
}

console.log(`\n=== done === created:${created}  skipped(exists):${skipped}  chapterJoined:${chapterJoined}  legacyMatched:${legacyMatched}  errors:${errors}`)
