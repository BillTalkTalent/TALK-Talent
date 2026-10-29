import { createClient } from "@/lib/supabase/server";
import { HeartHandshake } from "lucide-react";
import SignupControl from "./signup-control";

type Opportunity = { id: string; title: string; description: string | null };
type Signup = { opportunity_id: string; note: string | null };

export default async function FounderVolunteerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const [{ data: opportunities }, { data: mySignups }] = await Promise.all([
    db.from("founder_opportunities").select("id, title, description").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    user ? db.from("founder_volunteer_signups").select("opportunity_id, note").eq("member_id", user.id) : Promise.resolve({ data: [] }),
  ]);

  const signupMap = new Map(((mySignups ?? []) as Signup[]).map((s) => [s.opportunity_id, s.note]));

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <HeartHandshake className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Volunteer Options</h1>
          <p className="text-sm text-muted-foreground">Ways to pitch in on the rebuild</p>
        </div>
      </div>

      {(opportunities ?? []).length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <HeartHandshake className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nothing posted yet</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(opportunities as Opportunity[]).map((o) => (
            <li key={o.id} className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-3">
              <div>
                <p className="font-semibold text-foreground">{o.title}</p>
                {o.description && <p className="text-sm text-muted-foreground mt-0.5">{o.description}</p>}
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
