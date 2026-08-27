-- LinkedIn OAuth sign-in (app/login/login-form.tsx "Continue with LinkedIn")
-- creates a brand-new pending profile for anyone without an existing
-- account — same as any other OAuth "sign in or sign up" flow. But
-- LinkedIn's OIDC userinfo doesn't set raw_user_meta_data's 'full_name' or
-- 'avatar_url' keys (those are populated by the email/password signup form
-- instead, see migration 054) — it sets 'name'/'given_name'/'family_name'
-- and 'picture'. handle_new_user() only ever read the first pair, so every
-- LinkedIn-OAuth signup landed in the pending queue with a blank name and
-- blank avatar, on top of always having no linkedin_url (LinkedIn's OIDC
-- scopes don't expose a profile URL at all — that's still only fixable by
-- asking the member for it directly, not by better metadata parsing).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, linkedin_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'given_name', '') || ' ' || coalesce(new.raw_user_meta_data->>'family_name', '')), ''),
      ''
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', ''),
      ''
    ),
    new.raw_user_meta_data->>'linkedin_url'
  );
  return new;
end;
$$;
