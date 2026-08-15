-- Lets admins clone a real event as a "test" copy — same content, reachable
-- by direct link (so the LinkedIn-share -> apply -> approve loop can be
-- tested end-to-end, including RLS, using a real member account) but
-- excluded from every public/member-facing listing so it never shows up to
-- real members browsing events.
--
-- Deliberately a flag on top of status='published' rather than reusing
-- status='draft' — a draft event is invisible to non-admin members even via
-- direct link (RLS requires status='published'), which would break the very
-- step being tested: a freshly-approved test member landing back on the
-- event page.

alter table public.events add column if not exists is_test boolean not null default false;
