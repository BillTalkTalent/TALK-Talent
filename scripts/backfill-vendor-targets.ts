/**
 * backfill-vendor-targets.ts
 * ==========================
 * Pre-populates industries_served and company_sizes_served on vendors
 * based on their category, using curated defaults.
 *
 * Safe to re-run (only updates rows where both arrays are empty).
 * Admins can always override individual vendors via the Edit Details tab.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/backfill-vendor-targets.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Canonical values (must match INDUSTRIES / COMPANY_SIZES in vendors-grid.tsx)
// ---------------------------------------------------------------------------

const ALL_INDUSTRIES = [
  'Technology',
  'Healthcare & Life Sciences',
  'Financial Services',
  'Retail & E-commerce',
  'Manufacturing',
  'Professional Services',
  'Media & Entertainment',
  'Government & Public Sector',
  'Education',
  'Non-profit',
  'Real Estate',
  'Transportation & Logistics',
  'Energy & Utilities',
  'Hospitality & Travel',
  'All Industries',
]

const ALL_SIZES = [
  'Startup (1–50)',
  'SMB (51–500)',
  'Mid-market (501–2,000)',
  'Enterprise (2,001–10,000)',
  'Large Enterprise (10,001+)',
]

// Shorthand aliases used in the map below
const IND = {
  all:    ALL_INDUSTRIES,
  tech:   ['Technology'],
  health: ['Healthcare & Life Sciences'],
  fin:    ['Financial Services'],
  retail: ['Retail & E-commerce'],
  mfg:    ['Manufacturing'],
  prof:   ['Professional Services'],
  media:  ['Media & Entertainment'],
  gov:    ['Government & Public Sector'],
  edu:    ['Education'],
  hosp:   ['Hospitality & Travel'],
  trans:  ['Transportation & Logistics'],
  // common combos
  whitecol: ['Technology', 'Financial Services', 'Professional Services'],
  ops:      ['Manufacturing', 'Retail & E-commerce', 'Hospitality & Travel', 'Transportation & Logistics'],
  corporate: ['Technology', 'Financial Services', 'Healthcare & Life Sciences', 'Manufacturing', 'Professional Services'],
}

const SZ = {
  all:        ALL_SIZES,
  smb_up:     ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)', 'Large Enterprise (10,001+)'],
  mid_up:     ['Mid-market (501–2,000)', 'Enterprise (2,001–10,000)', 'Large Enterprise (10,001+)'],
  ent_up:     ['Enterprise (2,001–10,000)', 'Large Enterprise (10,001+)'],
  startup_mid: ['Startup (1–50)', 'SMB (51–500)', 'Mid-market (501–2,000)'],
  all_but_startup: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)', 'Large Enterprise (10,001+)'],
}

// ---------------------------------------------------------------------------
// Category → defaults map
// ---------------------------------------------------------------------------

type Defaults = { industries: string[]; sizes: string[] }

const CATEGORY_DEFAULTS: Record<string, Defaults> = {
  'ATS': {
    industries: IND.all,
    sizes: SZ.all,
  },
  'Assessments': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'E-Staffing': {
    industries: [...IND.tech, ...IND.prof, ...IND.health, ...IND.mfg, ...IND.retail],
    sizes: SZ.smb_up,
  },
  'Temp Labor Marketplace': {
    industries: [...IND.mfg, ...IND.retail, ...IND.hosp, ...IND.trans],
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Job Boards': {
    industries: IND.all,
    sizes: SZ.all,
  },
  'Referrals': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Background Checks': {
    industries: IND.all,
    sizes: SZ.all,
  },
  'CRM': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Job Post Optimization': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Analytics': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Matching Systems': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Video Interviewing': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Vendor Management Systems': {
    industries: IND.corporate,
    sizes: SZ.ent_up,
  },
  'ChatBots': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Employment Branding': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Job Advertising': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Deployment Platforms': {
    industries: [...IND.mfg, ...IND.retail, ...IND.hosp, ...IND.health, ...IND.trans],
    sizes: SZ.mid_up,
  },
  'Social Search': {
    industries: IND.whitecol,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Social Networks': {
    industries: IND.all,
    sizes: SZ.all,
  },
  'Employee Engagement': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Freelance Management Systems': {
    industries: [...IND.tech, ...IND.media, ...IND.prof, ...IND.fin],
    sizes: SZ.mid_up,
  },
  'Interview Management Tools': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Employer Reviews': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Candidate Communication': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Reference Checks': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'Job Board Aggregators': {
    industries: IND.all,
    sizes: SZ.all,
  },
  'Campus Recruiting': {
    industries: [...IND.tech, ...IND.fin, ...IND.prof, ...IND.health],
    sizes: SZ.ent_up,
  },
  'API Connectors': {
    industries: IND.tech,
    sizes: SZ.mid_up,
  },
  'Resume Parsing Software': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Recruiter Marketplaces': {
    industries: [...IND.tech, ...IND.fin, ...IND.prof],
    sizes: SZ.startup_mid,
  },
  'Job Distribution': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'AI Recruiting Tools': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Compensation Management': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'RPO': {
    industries: IND.corporate,
    sizes: SZ.ent_up,
  },
  'Time Tracking': {
    industries: IND.all,
    sizes: ['SMB (51–500)', 'Mid-market (501–2,000)', 'Enterprise (2,001–10,000)'],
  },
  'TA Consulting': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Interview Intelligence': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Diversity and Inclusion': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Shared Talent Networks': {
    industries: [...IND.tech, ...IND.prof],
    sizes: SZ.mid_up,
  },
  'Recruitment Marketing': {
    industries: IND.all,
    sizes: SZ.mid_up,
  },
  'Temp Labor Management': {
    industries: [...IND.mfg, ...IND.retail, ...IND.hosp, ...IND.trans],
    sizes: SZ.mid_up,
  },
  'Human Resources Management Systems': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
  'Crowdsourcing': {
    industries: IND.all,
    sizes: SZ.smb_up,
  },
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('🚀  Vendor target backfill')
  console.log('   Supabase:', SUPABASE_URL)
  console.log()

  // Fetch vendors with empty arrays only (don't overwrite manual edits)
  console.log('📥  Fetching vendors with no target data…')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendors, error } = await (supabase as any)
    .from('vendors')
    .select('id, name, category, industries_served, company_sizes_served')
    .eq('industries_served', '{}')
    .eq('company_sizes_served', '{}')

  if (error) {
    console.error('❌  Fetch error:', error.message)
    process.exit(1)
  }

  console.log(`   ${vendors.length} vendors to update`)
  console.log()

  let updated = 0, skipped = 0

  for (const vendor of vendors) {
    const cat: string = vendor.category ?? ''
    const defaults = CATEGORY_DEFAULTS[cat]

    if (!defaults) {
      console.log(`   ⚠️  No mapping for category "${cat}" (${vendor.name}) — skipping`)
      skipped++
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await (supabase as any)
      .from('vendors')
      .update({
        industries_served:    defaults.industries,
        company_sizes_served: defaults.sizes,
      })
      .eq('id', vendor.id)

    if (upErr) {
      console.error(`   ⚠️  Update failed for ${vendor.name}: ${upErr.message}`)
    } else {
      updated++
      if (updated % 50 === 0) process.stdout.write(`   ${updated}…\r`)
    }

    await sleep(20)
  }

  console.log(`\n✅  Done!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped (no mapping): ${skipped}`)
}

main().catch(err => {
  console.error('\n❌  Fatal:', err)
  process.exit(1)
})
