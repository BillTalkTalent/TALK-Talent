import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

type FoundingMember = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  title: string | null;
  bio: string | null;
};

export default async function FoundersDirectoryPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, company, title, bio")
    .eq("is_founding_member", true)
    .eq("status", "approved")
    .order("full_name", { ascending: true });

  const members = (data ?? []) as FoundingMember[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Users className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Founding Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} people helping rebuild TALK</p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No one yet</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/members/${m.id}`}
                className="flex items-start gap-3 rounded-2xl bg-card border border-border shadow-sm p-4 hover:shadow-md transition-all"
              >
                <Avatar className="size-11 shrink-0">
                  <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name ?? ""} />
                  <AvatarFallback>{(m.full_name ?? "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{m.full_name ?? "Unknown"}</p>
                  {(m.title || m.company) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[m.title, m.company].filter(Boolean).join(" at ")}
                    </p>
                  )}
                  {m.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{m.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
