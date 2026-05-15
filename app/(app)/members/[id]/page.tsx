import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Mail, Building2, Briefcase, Star, Shield, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!member) notFound();

  const { data: { user: viewer } } = await supabase.auth.getUser();
  const isOwnProfile = viewer?.id === member.id;

  const [{ data: memberships }, { data: chapters }, { data: leaderships }, { data: recentTopics }] = await Promise.all([
    supabase.from("chapter_memberships").select("chapter_id").eq("user_id", id),
    supabase.from("chapters").select("*").order("sort_order"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("chapter_leads").select("chapter_id").eq("user_id", id),
    supabase
      .from("forum_topics")
      .select("id, title, created_at, forum_categories(name, slug)")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const memberChapterIds = new Set((memberships ?? []).map((m) => m.chapter_id));
  const memberChapters = (chapters ?? []).filter((c) => memberChapterIds.has(c.id));
  const leadChapterIds = new Set(((leaderships ?? []) as { chapter_id: string }[]).map((l) => l.chapter_id));
  const ledChapters = (chapters ?? []).filter((c) => leadChapterIds.has(c.id));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar size="lg" className="size-20">
              {member.avatar_url && (
                <AvatarImage src={member.avatar_url} alt={member.full_name ?? ""} />
              )}
              <AvatarFallback className="text-2xl">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-xl font-semibold">{member.full_name ?? "Unknown"}</h1>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                {member.title && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Briefcase className="size-3.5" />
                    {member.title}
                  </span>
                )}
                {member.company && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="size-3.5" />
                    {member.company}
                  </span>
                )}
              </div>
            </div>

            {member.bio && (
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {member.bio}
              </p>
            )}

            <div className="flex gap-2 flex-wrap justify-center">
              {!isOwnProfile && (
                <Button render={<Link href={`/messages?new=${member.id}`} />}>
                  <MessageSquare className="size-4" />
                  Message
                </Button>
              )}
              {member.linkedin_url && (
                <Button variant="outline" render={<a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" />}>
                  <ExternalLink className="size-4" />
                  LinkedIn
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {member.role === "board_member" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  Board Member
                </span>
              )}
              {member.role === "admin" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                  <Shield className="size-3" />
                  Admin
                </span>
              )}
            </div>

            {/* Chapter leadership */}
            {ledChapters.length > 0 && (
              <div className="w-full pt-4 border-t">
                <h2 className="text-sm font-semibold mb-2 text-center text-amber-700">Chapter Lead</h2>
                <div className="flex flex-wrap gap-2 justify-center">
                  {ledChapters.map((c) => (
                    <Link key={c.id} href={`/chapters/${c.slug}`}>
                      <Badge variant="outline" className="text-sm border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer">
                        <Star className="size-3 fill-amber-400 text-amber-400 mr-1" />
                        {c.icon} {c.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {memberChapters.length > 0 && (
              <div className="w-full pt-4 border-t">
                <h2 className="text-sm font-semibold mb-2 text-center">Chapters</h2>
                <div className="flex flex-wrap gap-2 justify-center">
                  {memberChapters.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-sm">
                      {c.icon} {c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent forum activity */}
      {(recentTopics ?? []).length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="size-4 text-[#8b5cf6]" />
              <h2 className="text-sm font-semibold text-zinc-900">Recent Forum Posts</h2>
            </div>
            <ul className="space-y-2">
              {(recentTopics ?? []).map((topic) => {
                const cat = topic.forum_categories as { name: string; slug: string } | null;
                return (
                  <li key={topic.id}>
                    <Link
                      href={`/forum/${cat?.slug ?? ""}/${topic.id}`}
                      className="flex items-start justify-between gap-3 rounded-xl p-3 hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 group-hover:text-[#8b5cf6] transition-colors truncate">
                          {topic.title}
                        </p>
                        {cat && (
                          <span className="text-[11px] text-zinc-400">{cat.name}</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
