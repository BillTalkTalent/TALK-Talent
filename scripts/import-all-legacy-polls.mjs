// Full legacy-poll import from the raw options export (Desktop/raw poll data.csv).
// This is the authoritative import: exact per-option selection counts, real
// created/closed dates, legacy int_id, and the poll CREATOR mapped via
// member.id -> user_email -> profile. Does a clean sweep of all is_legacy polls
// and reloads all 243 (so it also upgrades the 10 scraped earlier). Re-attaches
// the 6 known comment texts (from legacy-polls.json) by legacy int_id.
//
// NOTE: this export has NO individual votes (user_id is the creator) and NO
// comment text (only counts) — those 80 other commented polls need a separate
// votes/comments export.
//
//   DRY=1 node scripts/import-all-legacy-polls.mjs
//         node scripts/import-all-legacy-polls.mjs
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const DRY = process.env.DRY === '1'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const POLL_CSV = '/Users/billtextio/Desktop/raw poll data.csv'
const MEMBER_CSV = '/Users/billtextio/Desktop/Textio/TALK Members - July 14.csv'

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const parse = (line) => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out }
  const header = parse(lines[0]).map((h) => h.trim().replace(/^﻿/, ''))
  return lines.slice(1).map((l) => { const c = parse(l); const o = {}; header.forEach((h, i) => (o[h || 'option_id'] = c[i])); return o })
}

// ── member.id -> emails ──────────────────────────────────────────────────────
const memberRows = parseCSV(fs.readFileSync(MEMBER_CSV, 'utf8'))
const emailsById = new Map()
for (const m of memberRows) {
  emailsById.set(m.id, [m.user_email, m['Professional Email'], m['Personal Email']].map((e) => (e || '').toLowerCase().trim()).filter(Boolean))
}

// ── scraped comment text keyed by legacy int_id ──────────────────────────────
const scraped = JSON.parse(fs.readFileSync('scripts/data/legacy-polls.json', 'utf8')).polls
const commentsByLegacyId = new Map()
const respondentsByLegacyId = new Map()
for (const p of scraped) {
  if (p.legacy_id) {
    if (p.comments?.length) commentsByLegacyId.set(p.legacy_id, p.comments)
    if (p.results_available) respondentsByLegacyId.set(p.legacy_id, p.total_votes)
  }
}

// ── group poll options ───────────────────────────────────────────────────────
const optionRows = parseCSV(fs.readFileSync(POLL_CSV, 'utf8')).filter((r) => !(r.deleted_at && r.deleted_at.trim()))
const pollMap = new Map()
for (const r of optionRows) { if (!pollMap.has(r.poll_id)) pollMap.set(r.poll_id, []); pollMap.get(r.poll_id).push(r) }

// ── resolve creator + commenter -> profile id ────────────────────────────────
// creators: collect their candidate emails, then look up profiles by email
const creatorEmailSet = new Set()
for (const [, opts] of pollMap) for (const e of emailsById.get(opts[0].user_id) || []) creatorEmailSet.add(e)
const emailToProfile = new Map()
{
  const emails = [...creatorEmailSet]
  for (let i = 0; i < emails.length; i += 300) {
    const { data } = await s.from('profiles').select('id, email').in('email', emails.slice(i, i + 300))
    for (const p of data || []) emailToProfile.set((p.email || '').toLowerCase(), p.id)
  }
}
function creatorProfile(userId) {
  for (const e of emailsById.get(userId) || []) if (emailToProfile.has(e)) return emailToProfile.get(e)
  return null
}
// commenters by name
const commenterNames = new Set()
for (const cs of commentsByLegacyId.values()) for (const c of cs) commenterNames.add(c.author_name)
const nameToProfile = new Map()
for (const name of commenterNames) {
  const { data } = await s.from('profiles').select('id, role').ilike('full_name', name)
  if (data && data.length) nameToProfile.set(name, (data.find((r) => r.role === 'admin' || r.role === 'board_member') || data[0]).id)
}
function ageToDate(age) {
  const now = Date.now(); if (!age) return new Date(now - 240 * 864e5)
  const m = age.match(/(\d+|a|an)\s+(day|week|month|year)/i); if (!m) return new Date(now - 240 * 864e5)
  const n = /^\d+$/.test(m[1]) ? parseInt(m[1]) : 1
  const unit = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }[m[2].toLowerCase()]
  return new Date(now - n * unit)
}

const now = Date.now()
let mappedCreators = 0
const summary = { polls: 0, options: 0, votes: 0, comments: 0, emptyPolls: 0, noCreator: 0 }
console.log(`${pollMap.size} polls in export${DRY ? ' (DRY RUN)' : ''}\n`)

if (!DRY) {
  const { error } = await s.from('polls').delete().eq('is_legacy', true)
  if (error) { console.error('sweep failed:', error.message); process.exit(1) }
  console.log('swept existing legacy polls.\n')
}

for (const [, opts] of pollMap) {
  const a = opts[0]
  const question = (a.question || '').trim()
  const isMulti = (a.multi_select || '').toUpperCase() === 'TRUE'
  const closesAt = a.closes_at ? new Date(a.closes_at) : null
  const status = closesAt && closesAt.getTime() > now ? 'active' : 'closed'
  const createdBy = creatorProfile(a.user_id)
  if (createdBy) mappedCreators++; else summary.noCreator++
  const sumSelections = opts.reduce((n, o) => n + (parseInt(o.selections_count) || 0), 0)
  if (sumSelections === 0) summary.emptyPolls++
  const legacyTotal = respondentsByLegacyId.get(a.int_id) ?? sumSelections // respondent-accurate where known

  if (DRY) { summary.polls++; summary.options += opts.length; continue }

  const { data: poll, error: pe } = await s.from('polls').insert({
    question,
    created_by: createdBy,
    is_multiple_choice: isMulti,
    status,
    is_legacy: true,
    legacy_id: a.int_id || null,
    legacy_total_votes: legacyTotal,
    closes_at: closesAt ? closesAt.toISOString() : null,
    created_at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
  }).select('id').single()
  if (pe) { console.log(`✗ poll ${a.int_id}: ${pe.message}`); continue }
  summary.polls++

  const optRows = opts.map((o, i) => ({ poll_id: poll.id, text: (o.text || '').trim(), sort_order: i, legacy_vote_count: parseInt(o.selections_count) || 0 }))
  const { data: insertedOpts, error: oe } = await s.from('poll_options').insert(optRows).select('id, legacy_vote_count')
  if (oe) { console.log(`  ✗ options for ${a.int_id}: ${oe.message}`); continue }
  summary.options += insertedOpts.length

  // Anonymous vote rows: one per counted selection, user_id NULL (never pinned
  // to a real member) so the poll has genuine poll_votes records.
  const voteRows = []
  for (const io of insertedOpts) for (let k = 0; k < (io.legacy_vote_count || 0); k++) voteRows.push({ poll_id: poll.id, option_id: io.id, user_id: null, is_anonymous: true })
  for (let i = 0; i < voteRows.length; i += 500) {
    const { error: ve } = await s.from('poll_votes').insert(voteRows.slice(i, i + 500))
    if (ve) console.log(`  ✗ votes for ${a.int_id}: ${ve.message}`); else summary.votes += Math.min(500, voteRows.length - i)
  }

  const cmts = commentsByLegacyId.get(a.int_id) || []
  for (const c of cmts) {
    const { error: ce } = await s.from('poll_comments').insert({
      poll_id: poll.id,
      user_id: nameToProfile.get(c.author_name) ?? null,
      author_name: nameToProfile.get(c.author_name) ? null : c.author_name,
      content: c.content, is_legacy: true, created_at: ageToDate(c.age).toISOString(),
    })
    if (!ce) summary.comments++
  }
}

console.log(`\nDone${DRY ? ' (dry)' : ''}.`)
console.log(`  polls: ${summary.polls} | options: ${summary.options} | anon votes: ${summary.votes} | comments re-attached: ${summary.comments}`)
console.log(`  creators mapped to a profile: ${mappedCreators} | unmapped (by "Unknown"): ${summary.noCreator} | empty(0-vote) polls: ${summary.emptyPolls}`)
