import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Hash, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function ForumPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const categoriesWithStats = await Promise.all(
    (categories ?? []).map(async (cat) => {
      const [countResult, latestResult] = await Promise.all([
        supabase
          .from("forum_topics")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id),
        supabase
          .from("forum_topics")
          .select("updated_at")
          .eq("category_id", cat.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single(),
      ]);
      return {
        ...cat,
        topicCount: countResult.count ?? 0,
        latestActivity: latestResult.data?.updated_at ?? null,
      };
    })
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
        >
          <MessageSquare className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Forum</h1>
          <p className="text-sm text-zinc-500">Join the conversation</p>
        </div>
      </div>

      {/* Categories */}
      {categoriesWithStats.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <MessageSquare className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No categories yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categoriesWithStats.map((category) => (
            <Link key={category.id} href={`/forum/${category.slug}`}>
              <div className="group flex items-center gap-4 rounded-2xl bg-white border border-zinc-100 p-4 shadow-sm hover:shadow-md hover:border-[#00d4aa] transition-all cursor-pointer">
                {/* Icon */}
                <div className="size-12 rounded-2xl bg-[#00d4aa]/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-[#00d4aa]/20 transition-colors">
                  {category.icon ? (
                    <span>{category.icon}</span>
                  ) : (
                    <Hash className="size-5 text-[#00d4aa]" />
                  )}
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 group-hover:text-[#00d4aa] transition-colors">
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
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-[#00d4aa] transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
