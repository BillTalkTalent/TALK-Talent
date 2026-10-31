import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";

type FounderEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  is_virtual: boolean;
  event_date: string;
  profiles: { full_name: string | null } | null;
  founder_event_rsvps: { id: string }[];
};

export default async function FounderCalendarPage() {
  const supabase = await createClient();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
  const now = new Date().toISOString();
  const selectCols = "id, title, description, location, is_virtual, event_date, profiles(full_name), founder_event_rsvps(id)";
  const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
    db.from("founder_events").select(selectCols).gte("event_date", now).order("event_date", { ascending: true }),
    db.from("founder_events").select(selectCols).lt("event_date", now).order("event_date", { ascending: false }),
  ]);

  const upcoming = (upcomingData ?? []) as FounderEvent[];
  const past = (pastData ?? []) as FounderEvent[];

  function EventCard({ e }: { e: FounderEvent }) {
    return (
      <li key={e.id} className="rounded-2xl bg-card border border-border shadow-sm p-4">
        <Link href={`/founders/calendar/${e.id}`} className="block space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground hover:underline">{e.title}</p>
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Users className="size-3.5" />
              {e.founder_event_rsvps?.length ?? 0}
            </span>
          </div>
          <p className="text-sm font-medium text-indigo-600">
            {format(new Date(e.event_date), "EEE, MMM d · h:mm a")}
          </p>
          {(e.location || e.is_virtual) && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {e.is_virtual ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
              {e.is_virtual ? "Virtual" : e.location}
            </p>
          )}
          {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
          <p className="text-xs text-muted-foreground">posted by {e.profiles?.full_name ?? "Unknown"}</p>
        </Link>
      </li>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">Founder-only meetings and get-togethers</p>
          </div>
        </div>
        <Button className="shadow-sm" render={<Link href="/founders/calendar/new" />}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border shadow-sm p-10 text-center">
            <CalendarIcon className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nothing on the calendar yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to post one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Past</h2>
          <ul className="space-y-3 opacity-60">
            {past.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
