import { revalidatePath } from "next/cache";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Pencil, Trash2, GripVertical, MessageCircleQuestion } from "lucide-react";
import ForumCategoryForm from "./forum-category-form";

const LEGACY_CATEGORY_SLUG = "legacy-national";
const UNANSWERED_WINDOW_DAYS = 30;

type ForumCategory = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  topic_count?: number;
};

async function deleteCategory(id: string) {
  "use server";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  await supabase.from("forum_categories").delete().eq("id", id);
  revalidatePath("/admin/forum");
}

async function upsertCategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string).trim();
  const description = ((formData.get("description") as string) ?? "").trim() || null;
  const slug = (formData.get("slug") as string).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const icon = ((formData.get("icon") as string) ?? "").trim() || null;
  const sort_order = parseInt((formData.get("sort_order") as string) ?? "0", 10) || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  if (id) {
    await supabase.from("forum_categories").update({ name, description, slug, icon, sort_order }).eq("id", id);
  } else {
    await supabase.from("forum_categories").insert({ name, description, slug, icon, sort_order });
  }
  revalidatePath("/admin/forum");
  revalidatePath("/forum");
}

export default async function AdminForumPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const [{ data: categories }, { data: topicCounts }] = await Promise.all([
    supabase.from("forum_categories").select("*").order("sort_order"),
    supabase.from("forum_topics").select("category_id"),
  ]);

  // "Unanswered" queue — recent, real (non-legacy, non-bot) topics with zero
  // replies, oldest first. Meant to make "reply to every new topic" a quick
  // daily pass instead of something an admin has to go hunt for: right now
  // most organic topics never get a single reply, and the fastest fix for
  // that is just making sure someone from TALK shows up first.
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - UNANSWERED_WINDOW_DAYS);
  const since = sinceDate.toISOString();
  const { data: recentTopics } = await supabase
    .from("forum_topics")
    .select("id, title, created_at, profiles(full_name, is_bot), forum_categories(name, slug)")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const realRecent = (recentTopics ?? []).filter(
    (t: { profiles: { is_bot?: boolean } | null; forum_categories: { slug: string } | null }) =>
      !t.profiles?.is_bot && t.forum_categories?.slug !== LEGACY_CATEGORY_SLUG
  );
  const { data: replyRows } = realRecent.length > 0
    ? await supabase.from("forum_replies").select("topic_id").in("topic_id", realRecent.map((t: { id: string }) => t.id))
    : { data: [] };
  const repliedTopicIds = new Set((replyRows ?? []).map((r: { topic_id: string }) => r.topic_id));
  const unanswered = realRecent.filter((t: { id: string }) => !repliedTopicIds.has(t.id));

  // Build topic count map
  const countMap: Record<string, number> = {};
  for (const t of topicCounts ?? []) {
    countMap[t.category_id] = (countMap[t.category_id] ?? 0) + 1;
  }

  const cats: ForumCategory[] = (categories ?? []).map((c: ForumCategory) => ({
    ...c,
    topic_count: countMap[c.id] ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Forum Categories</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage the categories members can post in.
          </p>
        </div>
      </div>

      {/* Unanswered topics — the daily "make sure someone replies" queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageCircleQuestion className="size-4 text-[#E8503A]" />
            Unanswered Topics
            <Badge variant="secondary" className="ml-1">{unanswered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unanswered.length === 0 ? (
            <p className="text-sm text-zinc-400 italic px-6 py-4">
              Nothing waiting — every real topic from the last {UNANSWERED_WINDOW_DAYS} days has at least one reply.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {unanswered.map((t: {
                id: string; title: string; created_at: string;
                profiles: { full_name: string | null } | null;
                forum_categories: { name: string; slug: string } | null;
              }) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 truncate">{t.title}</p>
                    <p className="text-xs text-zinc-400">
                      {t.profiles?.full_name ?? "A member"} &middot; {t.forum_categories?.name ?? "General"} &middot;{" "}
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Link
                    href={`/forum/${t.forum_categories?.slug ?? "general"}/${t.id}`}
                    className="shrink-0 text-xs font-semibold text-[#E8503A] hover:underline"
                  >
                    View &amp; reply &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add new category form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="size-4 text-[#E8503A]" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ForumCategoryForm action={upsertCategory} />
        </CardContent>
      </Card>

      {/* Existing categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="size-4 text-zinc-500" />
            Existing Categories
            <Badge variant="secondary" className="ml-1">{cats.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cats.length === 0 ? (
            <p className="text-sm text-zinc-400 italic px-6 py-4">No categories yet. Add one above.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {cats.map((cat) => (
                <li key={cat.id} className="flex items-start gap-3 px-6 py-4">
                  <GripVertical className="size-4 text-zinc-300 mt-1 shrink-0" />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                      <p className="font-semibold text-sm text-zinc-900">{cat.name}</p>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                        /{cat.slug}
                      </span>
                      <span className="text-xs text-zinc-400">{cat.topic_count} topic{cat.topic_count !== 1 ? "s" : ""}</span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-zinc-500 truncate">{cat.description}</p>
                    )}
                    <p className="text-[11px] text-zinc-300">Sort order: {cat.sort_order}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ForumCategoryForm
                      action={upsertCategory}
                      category={cat}
                      trigger={
                        <button className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all">
                          <Pencil className="size-3.5" />
                        </button>
                      }
                    />
                    {(cat.topic_count ?? 0) === 0 ? (
                      <form action={deleteCategory.bind(null, cat.id)}>
                        <button
                          type="submit"
                          className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete category (only possible when empty)"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span
                        className="size-7 flex items-center justify-center rounded-lg text-zinc-200 cursor-not-allowed"
                        title={`Can't delete — ${cat.topic_count} topic${cat.topic_count !== 1 ? "s" : ""} exist`}
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
