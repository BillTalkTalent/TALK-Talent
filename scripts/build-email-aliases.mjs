// Populates member_email_aliases from the migration export (via /tmp/members_clean.json,
// produced by prep-members.py). Maps each member's professional/personal email -> their
// primary login email. Skips: aliases that are already someone's login email, self-matches,
// and ambiguous addresses claimed by more than one member. Requires migration 036 first.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const members = JSON.parse(fs.readFileSync('/tmp/members_clean.json', 'utf8'))
const primaries = new Set(members.map(m => m.email))
const aliasMap = new Map()   // alias -> primary
const conflict = new Set()

for (const m of members) {
  for (const alt of [m.prof_email, m.personal_email]) {
    const a = (alt || '').toLowerCase().trim()
    if (!a || !emailRe.test(a)) continue
    if (a === m.email) continue            // same as primary
    if (primaries.has(a)) continue         // already a login email — resolves directly
    if (aliasMap.has(a) && aliasMap.get(a) !== m.email) { conflict.add(a); continue }
    aliasMap.set(a, m.email)
  }
}
for (const a of conflict) aliasMap.delete(a)  // drop ambiguous addresses

const rows = [...aliasMap.entries()].map(([alias_email, primary_email]) => ({ alias_email, primary_email }))
console.log(`aliases to load: ${rows.length} (dropped ${conflict.size} ambiguous)`)

let done = 0
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500)
  const { error } = await admin.from('member_email_aliases').upsert(chunk, { onConflict: 'alias_email', ignoreDuplicates: true })
  if (error) { console.log('ERROR at', i, error.message); break }
  done += chunk.length
  process.stdout.write(`\r  loaded ${done}/${rows.length}`)
}
console.log(`\ndone: ${done} aliases loaded`)
