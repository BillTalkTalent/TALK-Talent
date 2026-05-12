import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Hash, ChevronRight, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ForumSearchInput from "./forum-search-input";

interface SearchResult {
  id: string;
  title: string;
  body: string;
  slug: string | null;
  category_id: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  reply_count: number | null;
  views: number;
  categorySlug?: string;
  categoryName?: string;
  authorName?: string;
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const query = q?.trim() ?? "";

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  // Build a category lookup map
  const catMap: Record<string, { slug: string; name: string }> = {};
  for (const c of categories ?? []) {
    catMap[c.id] = { slug: c.slug, name: c.name };
  }

  // Search mode: find matching topics
  let searchResults: SearchResult[] = [];
  if (query.length >= 2) {
    const { data: topicHits } = await supabase
      .from("forum_topics")
      .select("*, profiles(full_name)")
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(30);

    searchResults = (topicHits ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slug: (t as any).slug ?? null,
      category_id: t.category_id,
      author_id: t.author_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reply_count: (t as any).reply_count ?? null,
      views: t.views ?? 0,
      categorySlug: catMap[t.category_id]?.slug,
      categoryName: catMap[t.category_id]?.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authorName: (t as any).profiles?.full_name ?? null,
    }));
  }

  // Category stats (only needed when not searching)
  let categoriesWithStats: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    icon: string | null;
    topicCount: number;
    latestActivity: string | null;
  }[] = [];

  if (!query) {
    const categoryIds = (categories ?? []).map((c) => c.id);
    const { data: allTopics } =
      categoryIds.length > 0
        ? await supabase
            .from("forum_topics")
            .select("category_id, updated_at")
            .in("category_id", categoryIds)
        : { data: [] };

    const topicCountMap: Record<string, number> = {};
    const latestActivityMap: Record<string, string> = {};
    for (const t of allTopics ?? []) {
      topicCountMap[t.category_id] = (topicCountMap[t.category_id] ?? 0) + 1;
      if (!latestActivityMap[t.category_id] || t.updated_at > latestActivityMap[t.category_id]) {
        latestActivityMap[t.category_id] = t.updated_at;
      }
    }

    categoriesWithStats = (categories ?? []).map((cat) => ({
      ...cat,
      topicCount: topicCountMap[cat.id] ?? 0,
      latestActivity: latestActivityMap[cat.id] ?? null,
    }));
  }

  // Highlight matching text
  function highlight(text: string, term: string): string {
    if (!term) return text;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}
        >
          <MessageSquare className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-900">Forum</h1>
          <p className="text-sm text-zinc-500">Join the conversation</p>
        </div>
      </div>

      {/* Search bar */}
      <ForumSearchInput defaultValue={query} />

      {/* Search results */}
      {query.length >= 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            {searchResults.length === 0
              ? `No results for "${query}"`
              : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${query}"`}
          </p>

          {searchResults.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-12 text-center">
              <Search className="size-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No topics found</p>
              <p className="text-zinc-300 text-sm mt-1">Try different keywords</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((topic) => {
                const bodyPreview = topic.body.replace(/[#*`>]/g, "").slice(0, 120);
                return (
                  <Link
                    key={topic.id}
                    href={`/forum/${topic.categorySlug ?? ""}/${topic.id}`}
                    className="group flex flex-col gap-1 rounded-2xl bg-white border border-zinc-100 p-4 shadow-sm hover:shadow-md hover:border-[#8b5cf6] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className="font-semibold text-zinc-900 group-hover:text-[#8b5cf6] transition-colors leading-snug"
                        dangerouslySetInnerHTML={{ __html: highlight(topic.title, query) }}
                      />
                      {topic.categoryName && (
                        <span className="text-[10px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full shrink-0">
                          {topic.categoryName}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm text-zinc-500 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: highlight(bodyPreview + (topic.body.length > 120 ? "…" : ""), query) }}
                    />
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                      {topic.authorName && <span>{topic.authorName}</span>}
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(topic.updated_at), { addSuffix: true })}</span>
                      <span>·</span>
                      <span>{topic.reply_count ?? 0} repl{(topic.reply_count ?? 0) !== 1 ? "ies" : "y"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : query.length === 1 ? (
        <p className="text-sm text-zinc-400 text-center py-4">Type at least 2 characters to search…</p>
      ) : (
        /* Category list — default view */
        <>
          {categoriesWithStats.length === 0 ? (
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
              <MessageSquare className="size-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No categories yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoriesWithStats.map((category) => (
                <Link key={category.id} href={`/forum/${category.slug}`}>
                  <div className="group flex items-center gap-4 rounded-2xl bg-white border border-zinc-100 p-4 shadow-sm hover:shadow-md hover:border-[#8b5cf6] transition-all cursor-pointer">
                    {/* Icon */}
                    <div className="size-12 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-[#8b5cf6]/20 transition-colors">
                      {category.icon ? (
                        <span>{category.icon}</span>
                      ) : (
                        <Hash className="size-5 text-[#8b5cf6]" />
                      )}
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 group-hover:text-[#8b5cf6] transition-colors">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-zinc-900">{category.topicCount}</p>
                        <p className="text-xs text-zinc-400">topics</p>
                      </div>
                      {category.latestActivity && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-zinc-400">Last post</p>
                          <p className="text-xs font-medium text-zinc-500">
                            {formatDistanceToNow(new Date(category.latestActivity), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                      <ChevronRight className="size-4 text-zinc-300 group-hover:text-[#8b5cf6] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
