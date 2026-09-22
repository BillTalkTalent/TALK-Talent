import { createAdminClient } from "@/lib/supabase/admin";

export const TA_NEWS_BOT_EMAIL = "digest@talktalent.com";
const TA_NEWS_BOT_NAME = "TALK Daily";
const TA_NEWS_BOT_BIO =
  "Automated daily briefing on Talent Acquisition news, sourced from the web. Posts are AI-generated and clearly marked — not a real community member.";

export const CHAPTER_PROMPT_BOT_EMAIL = "chapters@talktalent.com";
const CHAPTER_PROMPT_BOT_NAME = "TALK Chapters";
const CHAPTER_PROMPT_BOT_BIO =
  "Posts a weekly discussion prompt in each chapter to help start real conversations. Automated and clearly marked — not a real community member.";

/**
 * Gets (or, on first run, creates) a disclosed bot account for a given
 * identity — used by any cron that posts on the platform's behalf.
 * Idempotent — safe to call on every run, including concurrent ones.
 */
async function ensureBotProfile(opts: { email: string; name: string; bio: string }): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", opts.email)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: opts.email,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { full_name: opts.name },
  });

  if (createError || !created.user) {
    // Likely a concurrent run already created it — look it up again.
    const { data: retry } = await admin
      .from("profiles")
      .select("id")
      .eq("email", opts.email)
      .maybeSingle();
    if (retry) return retry.id;
    throw createError ?? new Error(`Failed to create bot account for ${opts.email}`);
  }

  // The on_auth_user_created trigger already inserted a bare profiles row
  // (status 'pending') — approve it and mark it as a disclosed bot.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("profiles")
    .update({
      full_name: opts.name,
      bio: opts.bio,
      status: "approved",
      role: "member",
      is_bot: true,
    })
    .eq("id", created.user.id);

  return created.user.id;
}

export function ensureDigestBotProfile(): Promise<string> {
  return ensureBotProfile({ email: TA_NEWS_BOT_EMAIL, name: TA_NEWS_BOT_NAME, bio: TA_NEWS_BOT_BIO });
}

export function ensureChapterPromptBotProfile(): Promise<string> {
  return ensureBotProfile({ email: CHAPTER_PROMPT_BOT_EMAIL, name: CHAPTER_PROMPT_BOT_NAME, bio: CHAPTER_PROMPT_BOT_BIO });
}
