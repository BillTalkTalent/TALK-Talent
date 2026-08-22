# TALK Platform Spec

This is the as-built reference for the TALK platform — what's been built, how each
piece works, and how the system is designed. It's meant to stay in sync with the
codebase; when a feature changes meaningfully, update the relevant section here too.

TALK is a private community platform for Talent Acquisition (TA) leaders, owned by
Recruitifi, at www.talktalent.com. It succeeds an older talktalent.com platform —
roughly 10,600 existing members were migrated in, which shapes several design
decisions below (legacy matching, duplicate-account detection, claim flow).

---

## 1. Tech Stack & Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Database / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Styling | Tailwind v4 + shadcn/ui (base-ui) |
| Rich text | Tiptap |
| Transactional & bulk email | Resend |
| Payments | Stripe (paid events) |
| AI | Anthropic API (`@anthropic-ai/sdk`) — TA news research, `claude-opus-5` + web search |
| Error tracking | Sentry |
| Product analytics | PostHog |
| Hosting | Vercel (cron jobs defined in `vercel.json`) |

### Two Supabase clients, by design

- **`lib/supabase/server.ts` / `lib/supabase/client.ts`** — the regular client, used
  in almost everything. Respects Row Level Security (RLS). This is the default —
  reach for it unless you specifically need to bypass RLS.
- **`lib/supabase/admin.ts`** (`createAdminClient()`) — service-role client that
  bypasses RLS entirely. Used only where it has to be: public routes with no signed-in
  user (event teaser pages, signup duplicate-matching), server-side cron jobs, and a
  handful of admin actions that need to touch rows the RLS policy wouldn't otherwise
  allow (e.g. deleting a duplicate `auth.users` row during profile merge).

Every table has RLS enabled. The near-universal pattern is:
```sql
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
```
for admin-only tables, and `p.status = 'approved'` for member-only-visible tables.

### Auth architecture — two independent checkpoints

1. **`middleware.ts`** — runs on every request. Redirects unauthenticated visitors to
   `/login`, except for an explicit `publicRoutes` allowlist. For `/admin/*` routes it
   also checks `profiles.role`.
2. **`app/(app)/layout.tsx`** — a *second*, independent auth check wrapping every page
   under the `(app)` route group. It can't see which middleware rule matched, so
   middleware passes the matched pathname forward via an `x-pathname` response header
   — that's how the layout knows to render a public event teaser instead of bouncing
   a logged-out visitor to `/login`.

Both checkpoints have to agree for a route to be genuinely public — this tripped us up
once when adding public event pages (see §5).

---

## 2. Identity & Access

### Legacy migration

`legacy_member_staging` holds ~10,624 members scraped from the old talktalent.com,
matched by `linkedin_url`. When an existing member signs up or gets approved on the
new platform, `match_legacy_member(profile_id)` (a Postgres function) looks for a
staging row with a matching LinkedIn URL and backfills their profile — job title,
company, board-member status, and (as of migration 055) **chapter membership**,
derived from the staging row's `group_name` (e.g. "Boston") via
`legacy_chapter_slug_map`, a hand-built mapping from the old site's city-only slugs
(`boston`) to this platform's real state-prefixed geographic chapter slugs
(`ma-boston`) — the two never matched directly, which is why every geographic
chapter silently had zero members until migration 055 fixed both the one-time
historical backfill (re-running the full original 12,864-member import through the
corrected mapping) and the ongoing `match_legacy_member` path.

### Signup & duplicate detection

A member re-signing up with a different email than their original account would,
naively, create a second history-less profile. Instead:

1. `app/signup/signup-form.tsx` calls `POST /api/signup/find-matches` **before**
   creating the account (service-role client, since there's no session yet).
2. That route does two parallel `ilike` searches — LinkedIn URL slug, and full name —
   merges and dedupes, caps at 5 candidates.
3. If matches are found, the signup form shows an "Is this you?" screen with
   candidate cards. The user can claim one or say none match.
4. `completeSignup(claimedMatchId)` creates the new auth account and profile as
   normal, but stamps `profiles.claimed_match_id` with the chosen candidate's id.
5. **Nothing merges automatically.** An admin sees "Claims to be: {name}" on the
   pending-approval list and explicitly confirms the match. This is deliberate —
   auto-merging on a self-reported claim is an impersonation vector (anyone could
   claim to be anyone). See `confirmMatch()` in `app/admin/page.tsx`.
6. Confirming a match deletes the duplicate new `auth.users` row, moves the new
   email onto the *old* account (preserving its id and everything attached to it —
   forum posts, poll votes, chapter memberships, RSVPs), and approves it. Order
   matters here: the duplicate account has to be deleted before the old account can
   take over its email, since `auth.users.email` is unique.

### Login

`app/login/login-form.tsx` supports two modes:
- **Magic link** (default) — passwordless, emailed one-click login.
- **LinkedIn OAuth** — styled as a solid `#0A66C2` button.

Both pass a `next` search param through to redirect back to wherever the user was
trying to go. Session cookie lifetime is governed by `@supabase/ssr`'s own defaults —
an earlier attempt to shorten it via `SESSION_COOKIE_OPTIONS.maxAge` turned out to be
a silent no-op, since the library resets `maxAge` to its own default on every write.

### Approval workflow

New signups land with `profiles.status = 'pending'`. They see `/pending` until an
admin acts:
- **Approve** → status flips to `approved`, legacy data is backfilled via
  `match_legacy_member`, and a welcome email goes out with a one-click magic link.
  If they signed up with a specific event in mind (`interested_event_id`, set when
  they signed up from a public event teaser page — see §5), the magic link drops
  them straight onto that event instead of the generic dashboard.
- **Reject** → status flips to `rejected` with an optional note, and a polite
  rejection email goes out. Can be reversed later from Members → Rejected/Suspended.

**LinkedIn URL is mandatory for approval.** Email was already fully enforced (a
`not null` column, and Supabase Auth itself requires one to sign up at all).
LinkedIn URL only had client-side `required` on the signup form — easy to bypass,
and not enforced anywhere else. Enforcing it at profile *creation* would break two
other flows that insert into `profiles` without a `linkedin_url` on hand yet: the
"invite a colleague" flow (`app/api/invite/route.ts`) and the automated bot account
(`lib/bot-account.ts`). Instead, a `before insert or update` trigger
(`profiles_require_linkedin_for_approval`, migration 054) blocks the transition to
`status = 'approved'` specifically — a member can't become approved without a
non-empty `linkedin_url` on file, regardless of which path created their (still
pending) row. Bots are exempt. Both approval actions (`app/admin/page.tsx` →
`approveMember()`, `app/admin/members/page.tsx` → `reactivateMember()`) check the
update's error and throw instead of silently sending a "you're approved" email for
an approval the database actually rejected.

### Roles & the super admin tier

`profiles.role` is `member | board_member | admin`. Board members get forum/chapter
moderation rights (pin/lock topics, remove posts, send chapter announcements) in
addition to regular members.

**Super admin is not a fourth role value** — it's a separate `profiles.is_superadmin`
boolean layered on top of `role = 'admin'`. This was a deliberate choice: roughly 30
RLS policies across the schema hardcode `role = 'admin'`, and adding a new role value
would have meant finding and rewriting every one of them (with real risk of missing
one and silently locking the super admin out of something). Keeping the super admin's
`role` as `'admin'` means every existing check keeps working unchanged, and exactly
one new gate (`lib/admin-auth.ts` → `requireSuperAdmin()`) sits on top for the
handful of actions reserved for it:

- Approving/rejecting member applications
- The duplicate-profile merge tool
- Granting admin access, and the super admin flag itself
- Suspending, reactivating, or removing existing members
- Sending or scheduling a newsletter, and bulk email to all members

Regular admins see those surfaces read-only (with an explanation) rather than the
controls simply vanishing. See §8 for the full admin-panel breakdown.

### Recovery / claim flow

`/claim` + `/api/auth/recovery` — a hardened, rate-limited alternate path to a magic
link, used for "I'm an existing member, get me back in" (marketed to legacy members
as "claim your account") and password reset. Deliberately vague on whether an email
is registered (always shows success) to avoid leaking account existence.

### Onboarding

`/welcome` — a short multi-step wizard (`welcome-wizard.tsx`) shown after first login:
confirm/complete profile basics, pick a chapter, and a couple of orientation steps.
Tracked via `profiles.has_onboarded`.

---

## 3. Core Community Features

### Members directory

`/members` — searchable/filterable directory of approved members (name, title,
company, chapter, TA level, company size, industry). Excludes bot accounts
(`is_bot = false`, see §7). `/members/[id]` is the individual profile page — bio,
chapter memberships/leadership, recent forum activity, DM entry point.

### Chapters

Two kinds, distinguished by `chapters.type`:
- **Topical** (9) — Executive & Leadership, Campus & Early Careers, Sourcing &
  Research, DEI in Talent, Tech & AI in TA, Employer Brand, Operations & Analytics,
  High-Volume Recruiting, Startup & Scaleup TA — each with a matching forum category.
- **Geographic** (~80) — city/region chapters (migration 014), state-prefixed slugs
  (`ma-boston`, `il-chicago`) to disambiguate same-named cities, plus `international`
  and `national` catch-alls. This is where local in-person events get targeted — see
  the "Email Members" chapter picker (§5) and the legacy-matching note (§2) for why
  historical membership in these specifically needed a dedicated backfill.

Members join/leave freely (`chapter_memberships`). Each chapter can have one or more
**chapter leads** (`chapter_leads`) who — along with admins/board members — can edit
the chapter and send email announcements to its members
(`app/(app)/chapters/[slug]/announce`).

### Forum

- **Categories**: General Discussion, Job Board, Best Practices, Tools & Tech, Ask
  the Community, Industry News (the last one added for the TA news bot, §7), plus one
  per chapter.
- **Home (`/forum`)**: a merged activity feed — newest topics across every category,
  Recent/Hot sort (same ranking formula as the per-category pages: engagement decayed
  by post age), category pills to filter into a specific one, and a persistent New
  Topic button. This replaced an earlier category-grid landing page that made it hard
  to see what was actually active without clicking into each category.
- **Topics & replies**: plain text (not HTML/Markdown — a submitted `<tag>` renders
  literally, it isn't interpreted), pin/lock (admin/board), view counts, notification
  fan-out to all approved members on new topics (`notify_on_forum_topic` trigger).
- **`/forum/new`**: category-picker version of the composer, for starting a topic
  without drilling into a category first.

### Chat & Direct Messages

Five default `chat_channels` (general, announcements, jobs, introductions,
resources) — persistent, realtime (`supabase_realtime` publication) group channels.
Separate from the forum; more like Slack than a discussion board. **DMs**
(`dm_conversations` / `dm_messages`) support both 1:1 and group conversations —
membership lives in a `conversation_participants` junction table (migration 061),
not the older `participant_a`/`participant_b` columns those still carry for
historical rows only. `dm_conversations.created_by` records who started it. RLS
membership checks route through a `SECURITY DEFINER` helper,
`is_dm_participant()`, both to avoid a table referencing its own RLS policy
recursively and — critically — because a brand-new conversation's creator isn't
in `conversation_participants` yet at the moment they need to read the row back
(that insert happens as a separate follow-up call), so the `dm_conversations`
SELECT policy also allows `created_by = auth.uid()` directly rather than relying
on `is_dm_participant()` alone. Sidebar list shows unread counts and
`last_message_preview` kept in sync via trigger. Composer auto-grows with
content and keeps focus after sending (it's intentionally never `disabled`
while a send is in flight — that used to blur it).

### Polls

Simple single/multi-choice polls (`polls` / `poll_options` / `poll_votes`), open to
any authenticated member to create and vote on, with anonymous-vote and
notification-preference variants added later.

### Mentorship

Members opt in as mentor and/or mentee across five topic areas (AI & Automation,
Building & Scaling TA, Data/Metrics/Reporting, DEI & Inclusive Hiring, Career
Growth). A mentee sends a `mentorship_request` to a mentor for a specific area;
accepting one auto-creates a `mentorship_connections` row via trigger.

### Talent Pool

An opt-in "open to new opportunities" directory (`talent_pool`) — headline, what
they're seeking, work preference, availability date. Members manage their own entry;
any approved member can browse.

### Job Board

Members post roles (`job_posts`) — title, company, location/remote, type, seniority,
salary range, apply URL or email. Admins can feature/manage any post.

### Vendor Directory & Reviews

A directory of recruiting vendors/tools (`vendors`) — members can submit new ones
(admin-approved) and leave structured reviews (`vendor_reviews`: overall/ease-of-use/
support/value ratings, pros/cons, tenure). Admins manage featured logos and vendor
enrichment fields.

### Notifications

In-app notifications (`notifications` table, unread-count indexed) for forum activity,
DMs, polls, and mentorship events, each with its own opt-out in
`/notifications/settings`.

### Creators — soft-launch preview, super admin only

`/creators` — a directory of invited TA leaders/practitioners (`creator_profiles`),
each with a public-style profile (`/creators/[id]`: bio, topics, links) and a feed
of resources they post themselves (`creator_materials`: video/deck/link, each with
its own publish toggle). Members manage their own page at `/creators/manage` —
create-if-none-exists, add/edit/delete/publish materials.

Gated to `profile.is_superadmin` at the page level (`redirect('/dashboard')`
otherwise) — nobody else can reach `/creators/*` yet, and the nav entry (under
"More") only renders for the super admin. This is deliberate: RLS already reflects
the intended public state (approved members can browse `is_approved = true`
profiles and `is_published = true` materials; a creator can always see their own,
even before approval), so opening this up later is a one-line change to the page
guard, not a new migration. Admin approve/feature toggles live inline on each
directory card rather than a separate `/admin/creators` page, since right now the
same person (the super admin) is both the only visible member and the approver.

---

## 4. Events

- **Free events** use `event_rsvps` (going/not_going/waitlist). **Paid events**
  (`events.is_paid`) go through Stripe Checkout (`/api/checkout` →
  `/api/webhooks/stripe`) into `event_registrations`, tracked separately from RSVPs
  since the money side needs its own status lifecycle (pending/completed/refunded/
  cancelled).
- **Public event teaser pages** (`app/(app)/events/[id]/page.tsx`): a non-member
  hitting a shared event link sees a public teaser — hero, description, how-to-join
  card once approved — with a "Register" flow into signup instead of a login wall.
  Backed by `GET /api/events/[id]/public` (service-role, explicit safe-column
  allowlist that deliberately excludes `virtual_url` so non-members can't grab the
  meeting link). This is the one place in the app that's genuinely public — see the
  middleware/layout dual-checkpoint note in §1.
- **Recordings & materials**: once an event's happened, an admin can attach a
  recording URL and supporting files (`event_materials`, backed by the
  `event-materials` Storage bucket) — surfaced as "Watch the Recording" on the event
  page, with an **Email RSVPs** button (admin-only) to notify attendees it's up.
- **Month calendar view** (`/events` → Calendar tab) — a real calendar grid of the
  selected month with events laid out on their date, timezone-correct via
  `lib/timezone.ts` helpers rather than raw UTC day boundaries.
- **Venue name** (`events.venue_name`, migration 056) — a dedicated field separate
  from `location` (the address), so an in-person event can call out "Thinking Cup
  Boston" distinctly instead of it being buried in one run-on address string. Every
  display surface (event page, events list, homepage, dashboard, admin list,
  event-reminder and newsletter emails, calendar exports, the Google Maps link)
  shows `venue_name` when present and falls back to `location`.
- **Test events** (`events.is_test`, migration 052) — admins can clone any real
  event as a `[TEST] `-prefixed copy via **Clone as test** (`/admin/events`). A test
  event is `status = 'published'` (so RLS lets a real, non-admin test account reach
  it via direct link, unlike a `draft`) but excluded from every public/member-facing
  listing (homepage, `/events`, admin dashboard, event-reminder cron) — it exists
  purely to exercise the LinkedIn-share → apply → approve loop end-to-end without
  exposing it to real members.

---

## 5. Content & Communications

### Public marketing homepage

`app/page.tsx` (`www.talktalent.com`) — real data, not the placeholder mockup it
started as: `getHeroStats()` (approved members, published non-test events, forum
topics, active jobs) and `getUpcomingEvents()` both use the service-role client with
an explicit safe-column allowlist, since RLS would otherwise block an anonymous
visitor entirely. `export const dynamic = 'force-dynamic'` is required — without it
Next tries to statically prerender the page at build time and crashes on the missing
Supabase env vars in a build environment that has none.

- **"See TALK in action"** — up to 3 real upcoming events, same public-teaser pattern
  as the individual event pages; the whole section hides if there are none.
- **Company ticker** — an infinite auto-scrolling marquee (`animate-marquee` keyframe
  in `globals.css`, list duplicated once for a seamless loop) of real companies
  approved members work at (`profiles.company`, deduped case-insensitively, ranked by
  frequency), not a hardcoded/placeholder logo list. Hides entirely if no member has
  a company on file. Speed scales with the list length (`--marquee-duration`) so it
  stays a readable pace regardless of how many companies there are.
- **Scroll-triggered reveal** (`components/scroll-reveal.tsx`) — a single
  `IntersectionObserver`-based component (no animation library) that fades + slides
  content up the first time it scrolls into view; used on the social-proof bar, the
  events/feature cards (staggered per item), the "why different" section, and the
  closing CTA. Respects `prefers-reduced-motion`.

### Newsletter

`admin/newsletter` — section-based composer (TALK News, Member Highlight, Industry
News, Career Opportunities), live preview, sponsor slot (auto-included "Presented by"
masthead + optional offer callout), test-send, save-as-draft, schedule-for-later, or
send now. Sending (`sendNewsletter()` in `lib/newsletter-send.ts`) paginates past
Supabase's 1k-row cap, skips `email_unsubscribes`, throttles via Resend's batch
endpoint. Scheduled sends fire from `/api/cron/send-newsletter`.

Two auto-generated blocks sit between the sponsor masthead and the greeting, so an
admin skipping a section doesn't mean the newsletter goes out empty of real content:
- **Upcoming events** (`lib/newsletter-events.ts`) — up to 3 real, published,
  non-test events (same query as the homepage), rendered as a date-tile list linking
  back to each event. Renders nothing if there are none.
- **"This week in TALK" stats** (`lib/newsletter-stats.ts`) — real weekly counts
  (new members, forum posts, event RSVPs, new job posts) via cheap head-count
  queries. Renders nothing if every count is zero.

**Public teaser page** (`app/(app)/newsletter/[id]/page.tsx`) — same public-teaser +
apply-to-join pattern as events (§4), wired the same way (a `/newsletter/` entry in
`middleware.ts`'s `publicRoutes` plus a matching bypass in `(app)/layout.tsx`). Shows
the intro, the real upcoming-events block, the real stats block, and a short excerpt
of the TALK News section — Member Highlight/Industry News/Career Opportunities stay
member-only, gated behind an "Apply for membership" / "Sign in" CTA. 404s for
anything not `sent` or `scheduled`, so a draft can't leak via a guessed id; it goes
live as soon as an edition is *scheduled* (not only once actually sent), so a link
prepped ahead of a scheduled send resolves immediately instead of 404ing until the
send fires.

**LinkedIn sharing for a sent/scheduled edition** — two paths, because posting to a
LinkedIn *company page* needs org-level Marketing Developer Platform access (a much
higher approval bar than the personal `w_member_social` scope used elsewhere), which
isn't set up:
- **Personal profile** — the same `ShareOnLinkedInButton` used for events/jobs,
  posting through the member's own LinkedIn OAuth connection.
- **TALK Company Page (manual)** — `components/newsletter-share-tools.tsx` gives a
  one-click **Copy link** (the public teaser URL) and **Download image** (the
  newsletter share card as a PNG), so it can be posted to the company page by hand
  through LinkedIn's own UI. Available on both the editor view (draft/scheduled) and
  the read-only sent view, as soon as the edition has an id.

### Bulk "Email Members"

A separate, simpler tool (`admin/email`) for one-off plain-text broadcasts outside
the newsletter format — same unsubscribe/throttling machinery, requires typing "SEND"
to confirm given the blast radius. A **"Send to"** picker (all approved members, or
one specific chapter) narrows the audience — `getChapters()` in
`app/admin/email/email-actions.ts` returns each chapter with its live reachable
(approved, non-unsubscribed) member count for the dropdown.

### Chapter announcements

Board members/admins/leads can email everyone in a specific chapter
(`app/(app)/chapters/[slug]/announce`) — much smaller blast radius than a full
newsletter, so it isn't super-admin gated.

### Unsubscribe & deliverability

`email_unsubscribes` (checked by every bulk sender above) and `email_bounces`
(recorded via `/api/webhooks/resend`) keep the list clean and flag members whose
email is bouncing.

### LinkedIn share cards

`lib/share-card.tsx` renders branded share images via `next/og`'s `ImageResponse`
(real Poppins font files, not system fallback) for jobs, forum topics, and events,
wired into a "Share on LinkedIn" button (`components/share-on-linkedin-button.tsx`).
Icons are hand-copied lucide path data rendered as plain SVG, not the lucide-react
components — those call `useContext` internally, which crashes under satori/next-og's
renderer (it walks the element tree outside a real React render, so hooks have no
dispatcher).

`generateNewsletterCardPng()` is a richer, purpose-built variant for newsletter
shares (`app/api/newsletter/[id]/card`): the same navy-gradient branding plus ambient
glow-orb atmosphere (matching the homepage hero treatment), colorful icon-badge stat
tiles, and — instead of that week's small deltas, which can look thin on a quiet
week — one bold "13,000+ TA leaders" headline number and a "Read the full
newsletter →" CTA pill. The route never returns a bare error: if the DB lookup,
stats query, font fetch, or rendering itself fails, it falls back to the plain
generic card rather than a broken-image icon.

---

## 6. AI-Assisted Content

Two features, deliberately built as a pair after rejecting an initial ask to have an
AI post under a fake persona — impersonation is a direct threat to a platform whose
whole value proposition is real conversations between real TA leaders.

### TA News digest bot (automated, disclosed)

- A dedicated, clearly-labeled bot account — `profiles.is_bot = true`, display name
  "TALK Daily" — auto-provisioned on first cron run (`lib/bot-account.ts`). Bot posts
  show a visible "Automated" badge everywhere (forum lists, topic pages, its own
  profile), and the account is excluded from member counts, the member directory, and
  every bulk-email recipient list.
- `lib/ta-news.ts` (`researchTaNews()`) calls `claude-opus-5` with the server-side
  `web_search` tool, researching the last 24h of TA/recruiting news and returning a
  formatted title + body (plain text — see the forum's no-HTML-rendering note above).
- `GET /api/cron/ta-news-digest` runs daily (`vercel.json`), posts the result as the
  bot into the **Industry News** forum category.

### News Brief (admin-facing, human-in-the-loop)

`admin/news-brief` — same research engine, but the result is handed to an admin as an
editable draft. Nothing posts automatically; the admin reviews/edits and posts it
under their own name via **Post to Forum**.

Both require `ANTHROPIC_API_KEY` set in the environment to actually run — it's not
configured by default the way `SUPABASE_SERVICE_ROLE_KEY` etc. are.

---

## 7. Admin Panel

All of `/admin/*` requires `role = 'admin'` (checked in both `middleware.ts` and
`app/admin/layout.tsx`). Header shows a gold "Super Admin" badge instead of the plain
"Admin" one when `is_superadmin` is set.

| Page | What it does | Super admin only? |
|---|---|---|
| `/admin` | Stats, pending-approval queue, member search/claim-link tool | Approve/reject/merge only |
| `/admin/members` | Full roster, role changes, suspend/reactivate, super-admin grant | Role changes, suspend/reactivate, super-admin grant |
| `/admin/chapters` | Manage chapters | No |
| `/admin/events` | Create/edit events, recording & materials manager | No |
| `/admin/jobs` | Moderate job posts | No |
| `/admin/vendors` | Manage vendor directory, featured logos | No |
| `/admin/newsletter` | Compose, draft, test-send | Send / schedule only |
| `/admin/email` | Bulk plain-text broadcast | Sending to all members |
| `/admin/forum` | Manage forum categories | No |
| `/admin/news-brief` | AI-assisted draft-for-review posting | No |
| `/admin/suggestions` | Review member invites & vendor suggestions | No |
| `/admin/activity` | Community-wide activity & engagement dashboard (below) | No |

A regular admin sees every restricted control either hidden or shown disabled with a
short explanation ("Only the super admin can…") rather than a control that just
throws `Forbidden` — see `lib/admin-auth.ts` for the shared `requireSuperAdmin()`
gate used server-side, mirrored by an `isSuperAdmin` prop threaded down to each
affected client component.

### `/admin/activity` — Community Activity dashboard

Rebuilt from a basic member signup/login table into a deep-dive, in the process
fixing two real bugs: `auth.admin.listUsers()` was capped at a single 500-row page
(now paginates properly, `listAllAuthUsers()`), and a plain unpaginated `profiles`
select was silently capped at 1,000 rows by PostgREST's default row limit even
though the community has 12,700+ profiles (now paginates via `.range()` with an
explicit `.order('id')` for stable page boundaries, `listAllProfiles()` — the
original version had neither an explicit sort nor error handling, so a failed later
page was silently indistinguishable from "no more rows" and the dashboard just kept
showing a suspicious, unchanging round number).

- **North Star metrics** — engaged-members % (has ever posted/RSVP'd/voted/etc.,
  shown against both approved members and total profiles), 30-day usage % (logged in
  in the last 30 days), and stickiness (DAU/MAU, active-today ÷ active-this-month).
- **Activation & at-risk** — activation rate (of members who joined in the last 30
  days, % who took a first action within 7 days) and an at-risk count (approved
  members active before but not in the last 30 days — an early-warning list distinct
  from "never logged in").
- **Engagement trend** — a daily bar chart sourced from `activity_snapshots`, written
  by a new daily cron (`/api/cron/activity-snapshot`) so the dashboard shows a real
  trend instead of a single point-in-time read.
- **Activity by Feature** — a 10-tile breakdown across forum, events, jobs, chat,
  polls, mentorship, and vendor reviews.
- **Most Engaging Areas** — distinct members who actually participated per feature,
  last 30 days — reuses the same rows already fetched for the engaged-members metric,
  no extra queries.
- **Where Members Are Going** — page views by top-level route section, last 30 days,
  sourced from a new `page_views` table. `components/page-view-tracker.tsx`, mounted
  in `(app)/layout.tsx`, logs a row via a server action (`lib/log-page-view.ts`)
  every time the route changes for a signed-in member. Not a click/scroll heatmap
  (that needs a dedicated tool like PostHog with its own account) — this is real
  route-level navigation data the app already has.
- **Most Recently Active** — capped to the 100 most-recently-active members (was:
  the entire roster rendered as one HTML table, which is what was making the page
  slow to load with a community this size), with a link to `/admin/members` — the
  dedicated, already-paginated member directory — for the full list.

---

## 8. Data Model Reference

Grouped by domain — not full DDL, just what each table is for. See `supabase/migrations/`
for the authoritative schema (numbered, applied in order, written idempotently so
they're safe to re-run against partially-applied state).

**Identity**: `profiles`, `legacy_member_staging`

**Forum & Chat**: `forum_categories`, `forum_topics`, `forum_replies`,
`chat_channels`, `chat_messages`, `dm_conversations`, `dm_messages`,
`conversation_participants`

**Events**: `events` (incl. `venue_name`, `is_test`), `event_rsvps`,
`event_registrations`, `event_materials`

**Chapters**: `chapters`, `chapter_memberships`, `chapter_leads`,
`legacy_chapter_slug_map` (old-site city slug → real chapter slug, migration 055)

**Analytics**: `page_views` (route navigation, insert-your-own-row RLS, admin-only
reads), `activity_snapshots` (daily north-star rollups, RLS enabled with zero
policies — service-role only, same pattern as `linkedin_connections`)

**Community features**: `polls`, `poll_options`, `poll_votes`, `mentorship_areas`,
`mentorship_profiles`, `mentorship_area_selections`, `mentorship_requests`,
`mentorship_connections`, `talent_pool`, `job_posts`

**Vendors**: `vendors`, `vendor_reviews`

**Creators** (soft-launch preview, §3): `creator_profiles`, `creator_materials`

**Comms**: `newsletters`, `notifications`, `invitations`, `vendor_suggestions`,
`email_unsubscribes`, `email_bounces`

**Admin/ops**: (role/status/`is_superadmin`/`is_bot` all live on `profiles`)

---

## 9. External Integrations & Environment

| Service | Used for | Required env var(s) |
|---|---|---|
| Supabase | DB, auth, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Resend | All transactional & bulk email | `RESEND_API_KEY`, `FROM_EMAIL`, `REPLY_TO_EMAIL` |
| Stripe | Paid event checkout | Stripe keys + webhook secret |
| LinkedIn | OAuth login + share cards | LinkedIn Developer app credentials |
| Anthropic | TA news bot + News Brief | `ANTHROPIC_API_KEY` — **not set by default, blocks both AI features until added** |
| Sentry | Error tracking | Sentry DSN |
| PostHog | Product analytics | PostHog key |
| Vercel Cron | Scheduled jobs below | `CRON_SECRET` |

### Cron jobs (`vercel.json`)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/ta-news-digest` | Daily, 7am UTC | TA news bot posts to Industry News |
| `/api/cron/forum-digest` | Daily, 9am UTC | Email digest of the last 24h's forum activity |
| `/api/cron/event-reminders` | Daily, 10am UTC | Reminder emails for events in the next 24–25h |
| `/api/cron/send-newsletter` | Every request checks for due sends | Fires newsletters scheduled for "now" |
| `/api/cron/activity-snapshot` | Daily, 11:55pm UTC | Writes the day's north-star numbers to `activity_snapshots` for the `/admin/activity` trend chart |

---

*Last written: reflects the state of the codebase through the rebuilt
`/admin/activity` dashboard, the homepage redesign (real hero stats, company
ticker, scroll reveal), the newsletter overhaul (real events/stats blocks, public
teaser page, LinkedIn sharing, redesigned share card), mandatory LinkedIn URLs for
approval, chapter email targeting, the geographic chapter-matching fix, and the
event venue field. Update this doc as part of shipping any feature that changes the
picture above.*
