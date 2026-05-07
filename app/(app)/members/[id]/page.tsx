import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Mail, Building2, Briefcase } from "lucide-react";

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

  const [{ data: memberships }, { data: chapters }] = await Promise.all([
    supabase.from("chapter_memberships").select("chapter_id").eq("user_id", id),
    supabase.from("chapters").select("*").order("sort_order"),
  ]);

  const memberChapterIds = new Set((memberships ?? []).map((m) => m.chapter_id));
  const memberChapters = (chapters ?? []).filter((c) => memberChapterIds.has(c.id));

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
              <Button render={<Link href={`/messages?with=${member.id}`} />}>
                <Mail className="size-4" />
                Send Message
              </Button>
              {member.linkedin_url && (
                <Button variant="outline" render={<a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" />}>
                  <ExternalLink className="size-4" />
                  LinkedIn
                </Button>
              )}
            </div>

            {member.role === "admin" && (
              <Badge variant="secondary">Admin</Badge>
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
    </div>
  );
}
