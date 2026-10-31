import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { MapPin, Video, Users } from "lucide-react";
import RsvpControl from "../rsvp-control";

export default async function FounderEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };

  const { data: event } = await db
    .from("founder_events")
    .select("id, title, description, location, is_virtual, virtual_url, event_date, end_date, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();
  const e = event as {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    is_virtual: boolean;
    virtual_url: string | null;
    event_date: string;
    end_date: string | null;
    profiles: { full_name: string | null } | null;
  };

  const { data: rsvps } = await db
    .from("founder_event_rsvps")
    .select("member_id, profiles(full_name)")
    .eq("event_id", id);

  const attendees = (rsvps ?? []) as { member_id: string; profiles: { full_name: string | null } | null }[];
  const isGoing = !!user && attendees.some((a) => a.member_id === user.id);
  const isPast = e.event_date < new Date().toISOString();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/calendar" className="hover:underline">Calendar</Link>
        <span>/</span>
        <span className="truncate">{e.title}</span>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-3">
        <h1 className="text-lg font-bold text-foreground">{e.title}</h1>
        <p className="text-sm font-semibold text-indigo-600">
          {format(new Date(e.event_date), "EEEE, MMMM d, yyyy · h:mm a")}
          {e.end_date && ` – ${format(new Date(e.end_date), "h:mm a")}`}
        </p>
        {e.is_virtual ? (
          e.virtual_url && (
            <a
              href={e.virtual_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              <Video className="size-4" />
              Join link
            </a>
          )
        ) : (
          e.location && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {e.location}
            </p>
          )
        )}
        {e.description && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{e.description}</p>}
        <p className="text-xs text-muted-foreground">
          posted by {e.profiles?.full_name ?? "Unknown"}
        </p>
        {!isPast && (
          <div className="pt-1 border-t border-border/60">
            <RsvpControl eventId={e.id} initialGoing={isGoing} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Users className="size-4" />
          Going <span className="text-muted-foreground font-normal">({attendees.length})</span>
        </h2>
        {attendees.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <li key={a.member_id} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-foreground">
                {a.profiles?.full_name ?? "Unknown"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
