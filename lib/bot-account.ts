import { createAdminClient } from "@/lib/supabase/admin";

export const TA_NEWS_BOT_EMAIL = "digest@talktalent.com";
const BOT_NAME = "TALK Daily";
const BOT_BIO =
  "Automated daily briefing on Talent Acquisition news, sourced from the web. Posts are AI-generated and clearly marked — not a real community member.";

/**
 * Gets (or, on first run, creates) the disclosed bot account that posts the
 * automated TA news digest. Idempotent — safe to call on every cron run.
 */
export async function ensureDigestBotProfile(): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", TA_NEWS_BOT_EMAIL)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TA_NEWS_BOT_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { full_name: BOT_NAME },
  });

  if (createError || !created.user) {
    // Likely a concurrent run already created it — look it up again.
    const { data: retry } = await admin
      .from("profiles")
      .select("id")
      .eq("email", TA_NEWS_BOT_EMAIL)
      .maybeSingle();
    if (retry) return retry.id;
    throw createError ?? new Error("Failed to create TA news bot account");
  }

  // The on_auth_user_created trigger already inserted a bare profiles row
  // (status 'pending') — approve it and mark it as a disclosed bot.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("profiles")
    .update({
      full_name: BOT_NAME,
      bio: BOT_BIO,
      status: "approved",
      role: "member",
      is_bot: true,
    })
    .eq("id", created.user.id);

  return created.user.id;
}
