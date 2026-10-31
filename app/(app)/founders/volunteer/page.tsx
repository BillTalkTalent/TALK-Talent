import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, HeartHandshake, MessageCircle } from "lucide-react";
import SignupControl from "./signup-control";

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  profiles: { full_name: string | null } | null;
  founder_opportunity_comments: { id: string }[];
};
type Signup = { opportunity_id: string; note: string | null };

export default async function FounderVolunteerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const [{ data: opportunities }, { data: mySignups }] = await Promise.all([
    db
      .from("founder_opportunities")
      .select("id, title, description, profiles(full_name), founder_opportunity_comments(id)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    user ? db.from("founder_volunteer_signups").select("opportunity_id, note").eq("member_id", user.id) : Promise.resolve({ data: [] }),
  ]);

  const signupMap = new Map(((mySignups ?? []) as Signup[]).map((s) => [s.opportunity_id, s.note]));

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Volunteer Options</h1>
            <p className="text-sm text-muted-foreground">Ways to pitch in on the rebuild</p>
          </div>
        </div>
        <Button className="shadow-sm" render={<Link href="/founders/volunteer/new" />}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      {(opportunities ?? []).length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <HeartHandshake className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nothing posted yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to post one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(opportunities as Opportunity[]).map((o) => (
            <li key={o.id} className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/founders/volunteer/${o.id}`} className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground hover:underline">{o.title}</p>
                  {o.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{o.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">posted by {o.profiles?.full_name ?? "Unknown"}</p>
                </Link>
                <Link
                  href={`/founders/volunteer/${o.id}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 hover:text-foreground"
                >
                  <MessageCircle className="size-3.5" />
                  {o.founder_opportunity_comments?.length ?? 0}
                </Link>
              </div>
              <SignupControl
                opportunityId={o.id}
                initialSignedUp={signupMap.has(o.id)}
                initialNote={signupMap.get(o.id) ?? ""}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
