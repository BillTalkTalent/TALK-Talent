// Without an explicit maxAge, @supabase/ssr sets the auth cookie with no
// expiry, so browsers treat it as a session cookie and drop it as soon as
// the browser fully closes — forcing a re-login far more often than the
// underlying Supabase session actually expires.
export const SESSION_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 14, // 14 days, refreshed on every request
};
