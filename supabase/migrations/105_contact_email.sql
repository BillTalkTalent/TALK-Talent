-- Admins kept trying to "fix a member's email" by editing profiles.email —
-- which also IS their login identity (synced to auth.users.email, and for
-- anyone who signed up via LinkedIn OAuth, tied to a LinkedIn identity row
-- that this never updates). That's what went wrong for David Marr, Tom
-- Elliott, and Pamela Griffin this session: "fixing" an email silently
-- detached someone's real login from the account that now has it.
--
-- This splits the two: profiles.email stays exactly what it's always been
-- (the login identity — admins should now rarely if ever touch it directly),
-- and contact_email is a new, nullable, freely-editable field for "what
-- address TALK actually sends mail to." effective_email is a generated
-- column so every send path can just select it — defaults to the login
-- email until an admin sets a contact_email for that person, so this is a
-- no-op for all 12,800+ existing members until someone deliberately edits one.
alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists effective_email text
    generated always as (coalesce(contact_email, email)) stored;
