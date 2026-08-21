import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Star, Check, X } from "lucide-react";

type CreatorRow = {
  id: string;
  display_name: string;
  tagline: string | null;
  avatar_url: string | null;
  topics: string[] | null;
  is_featured: boolean;
  is_approved: boolean;
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default async function CreatorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.is_superadmin) redirect("/dashboard");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: creators } = await db
    .from("creator_profiles")
    .select("id, display_name, tagline, avatar_url, topics, is_featured, is_approved")
    .order("is_featured", { ascending: false })
    .order("display_name", { ascending: true });

  const rows: CreatorRow[] = creators ?? [];

  const { data: materialCounts } = await db
    .from("creator_materials")
    .select("creator_id");
  const countMap: Record<string, number> = {};
  for (const m of materialCounts ?? []) {
    countMap[m.creator_id] = (countMap[m.creator_id] ?? 0) + 1;
  }

  async function toggleApproved(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const next = formData.get("next") === "true";
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("creator_profiles").update({ is_approved: next }).eq("id", id);
    redirect("/creators");
  }

  async function toggleFeatured(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const next = formData.get("next") === "true";
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("creator_profiles").update({ is_featured: next }).eq("id", id);
    redirect("/creators");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
          >
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Creators
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Preview — only you can see this
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              TA leaders and practitioners sharing frameworks, videos, and templates
            </p>
          </div>
        </div>
        <Link
          href="/creators/manage"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
        >
          Manage my creator page
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <Sparkles className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No creators yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start by setting up your own creator page to try it out.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-card border border-border shadow-sm p-5 flex flex-col hover:border-cyan-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt={c.display_name} className="size-14 rounded-2xl object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="size-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
                  >
                    {getInitials(c.display_name)}
                  </div>
                )}
                <div className="flex flex-col items-end gap-1">
                  {c.is_featured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      <Star className="size-2.5 fill-amber-500 text-amber-500" /> Featured
                    </span>
                  )}
                  {!c.is_approved && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                      Pending approval
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/creators/${c.id}`} className="font-bold text-base text-foreground hover:text-cyan-700 transition-colors">
                {c.display_name}
              </Link>
              {c.tagline && <p className="text-sm text-muted-foreground mt-0.5 leading-snug flex-1">{c.tagline}</p>}
              {c.topics && c.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.topics.map((t) => (
                    <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{countMap[c.id] ?? 0} resources shared</span>
                <div className="flex items-center gap-1.5">
                  <form action={toggleApproved}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="next" value={String(!c.is_approved)} />
                    <button
                      type="submit"
                      title={c.is_approved ? "Unapprove" : "Approve"}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        c.is_approved
                          ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {c.is_approved ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    </button>
                  </form>
                  <form action={toggleFeatured}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="next" value={String(!c.is_featured)} />
                    <button
                      type="submit"
                      title={c.is_featured ? "Unfeature" : "Feature"}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        c.is_featured
                          ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Star className={`size-3.5 ${c.is_featured ? "fill-amber-500" : ""}`} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
