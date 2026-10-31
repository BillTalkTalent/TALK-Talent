import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import SignupControl from "../signup-control";
import OpportunityCommentSection from "./opportunity-comment-section";

export default async function VolunteerOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };

  const { data: opportunity } = await db
    .from("founder_opportunities")
    .select("id, title, description, created_at, created_by, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!opportunity) notFound();
  const o = opportunity as {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    created_by: string | null;
    profiles: { full_name: string | null } | null;
  };

  const [{ data: mySignup }, { data: comments }] = await Promise.all([
    user
      ? db.from("founder_volunteer_signups").select("note").eq("opportunity_id", id).eq("member_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("founder_opportunity_comments")
      .select("id, body, created_at, author_id, profiles(full_name)")
      .eq("opportunity_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/volunteer" className="hover:underline">Volunteer Options</Link>
        <span>/</span>
        <span className="truncate">{o.title}</span>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-3">
        <h1 className="text-lg font-bold text-foreground">{o.title}</h1>
        {o.description && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{o.description}</p>}
        <p className="text-xs text-muted-foreground">
          posted by {o.profiles?.full_name ?? "Unknown"} · {format(new Date(o.created_at), "MMM d, yyyy")}
        </p>
        <div className="pt-1">
          <SignupControl
            opportunityId={o.id}
            initialSignedUp={!!mySignup}
            initialNote={(mySignup as { note: string | null } | null)?.note ?? ""}
          />
        </div>
      </div>

      <OpportunityCommentSection
        opportunityId={o.id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments={(comments ?? []) as any}
        currentUserId={user?.id ?? ""}
        authorId={o.created_by}
        opportunityTitle={o.title}
      />
    </div>
  );
}
