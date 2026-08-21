import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, ExternalLink, Play, FileText, Link as LinkIcon, Star } from "lucide-react";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const typeMeta: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  video: { icon: <Play className="size-3" />, cls: "bg-cyan-50 text-cyan-700 border-cyan-100", label: "Video" },
  deck: { icon: <FileText className="size-3" />, cls: "bg-violet-50 text-violet-700 border-violet-100", label: "Deck" },
  link: { icon: <LinkIcon className="size-3" />, cls: "bg-muted text-muted-foreground border-border", label: "Link" },
};

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.is_superadmin) redirect("/dashboard");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: creator } = await db
    .from("creator_profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!creator) notFound();

  const isOwner = creator.user_id === user.id;

  const { data: materials } = await db
    .from("creator_materials")
    .select("*")
    .eq("creator_id", id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const visibleMaterials = (materials ?? []).filter((m: { is_published: boolean }) => m.is_published || isOwner);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/creators" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> All Creators
      </Link>

      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="h-20" style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }} />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8">
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="size-20 rounded-2xl object-cover flex-shrink-0 ring-4 ring-card"
              />
            ) : (
              <div
                className="size-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 ring-4 ring-card"
                style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
              >
                {getInitials(creator.display_name)}
              </div>
            )}
            {creator.is_featured && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full mb-1">
                <Star className="size-3 fill-amber-500 text-amber-500" /> Featured Creator
              </span>
            )}
            {!creator.is_approved && (
              <span className="text-[11px] font-bold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full mb-1">
                Pending approval
              </span>
            )}
          </div>
          <div className="mt-4">
            <h1 className="text-xl font-bold text-foreground">{creator.display_name}</h1>
            {creator.bio && <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">{creator.bio}</p>}
            {creator.topics && creator.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {creator.topics.map((t: string) => (
                  <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {(creator.website_url || creator.linkedin_url || creator.youtube_url) && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                {creator.website_url && (
                  <a href={creator.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cyan-700 transition-colors">
                    <Globe className="size-3.5" /> Website
                  </a>
                )}
                {creator.linkedin_url && (
                  <a href={creator.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cyan-700 transition-colors">
                    <ExternalLink className="size-3.5" /> LinkedIn
                  </a>
                )}
                {creator.youtube_url && (
                  <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cyan-700 transition-colors">
                    <Play className="size-3.5" /> YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Shared Resources</h2>
        {visibleMaterials.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border shadow-sm p-10 text-center">
            <p className="text-sm text-muted-foreground">No resources shared yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border">
            {visibleMaterials.map((m: { id: string; title: string; type: string; url: string; is_published: boolean; created_at: string }) => {
              const meta = typeMeta[m.type] ?? typeMeta.link;
              return (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/60 transition-colors"
                >
                  <div className="size-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {!m.is_published && " · Draft"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${meta.cls}`}>
                    {meta.icon} {meta.label}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
