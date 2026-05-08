import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CalendarDays, MapPin, Monitor, Users, CreditCard } from "lucide-react";
import type { Event } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/stripe";

type PaidEvent = Event & { is_paid: boolean; price: number | null; currency: string };

async function getEventAttendeeCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
): Promise<number> {
  const { count } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going");
  return count ?? 0;
}

function EventCard({ event, attendeeCount }: { event: PaidEvent; attendeeCount: number }) {
  const eventDate = new Date(event.event_date);
  return (
    <Link href={`/events/${event.id}`}>
      <div className="group rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-[#f97316] transition-all overflow-hidden cursor-pointer h-full flex flex-col">
        {/* Hero image or accent bar */}
        {event.image_url ? (
          <div className="relative h-40 overflow-hidden bg-zinc-100">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-1 bg-gradient-to-r from-[#ea580c] to-[#f97316]" />
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ea580c] bg-[#f97316]/10 border border-[#f97316]/20 px-2.5 py-1 rounded-full">
              <CalendarDays className="size-3" />
              {format(eventDate, "MMM d, yyyy")}
            </span>
            <div className="flex items-center gap-1.5">
              {event.is_paid && event.price != null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#00b894] px-2.5 py-1 rounded-full">
                  <CreditCard className="size-3" />
                  {formatPrice(event.price, event.currency)}
                </span>
              )}
              {event.is_virtual ? (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Virtual</span>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">In Person</span>
              )}
            </div>
          </div>

          <h3 className="font-bold text-zinc-900 group-hover:text-[#f97316] transition-colors leading-snug text-base">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-sm text-zinc-500 mt-2 line-clamp-2 flex-1">{event.description}</p>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              {event.is_virtual ? (
                <><Monitor className="size-3" /> Virtual · {format(eventDate, "h:mm a")}</>
              ) : (
                <><MapPin className="size-3" /> {event.location ?? "TBD"} · {format(eventDate, "h:mm a")}</>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">
              <Users className="size-3" /> {attendeeCount} going
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TabButton({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        active
          ? "bg-[#f97316] text-white shadow-sm"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "past" ? "past" : "upcoming";
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("event_date", now)
      .order("event_date", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .lt("event_date", now)
      .order("event_date", { ascending: false })
      .limit(20),
  ]);

  const upcomingEvents = (upcomingResult.data ?? []) as PaidEvent[];
  const pastEvents = (pastResult.data ?? []) as PaidEvent[];

  const [upcomingCounts, pastCounts] = await Promise.all([
    Promise.all(upcomingEvents.map((e) => getEventAttendeeCount(supabase, e.id))),
    Promise.all(pastEvents.map((e) => getEventAttendeeCount(supabase, e.id))),
  ]);

  const events = activeTab === "upcoming" ? upcomingEvents : pastEvents;
  const counts = activeTab === "upcoming" ? upcomingCounts : pastCounts;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>
            <CalendarDays className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Events</h1>
            <p className="text-sm text-zinc-500">Community gatherings and meetups</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl w-fit">
        <TabButton href="/events?tab=upcoming" label={`Upcoming (${upcomingEvents.length})`} active={activeTab === "upcoming"} />
        <TabButton href="/events?tab=past" label={`Past (${pastEvents.length})`} active={activeTab === "past"} />
      </div>

      {/* Grid */}
      {events.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <CalendarDays className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No {activeTab} events</p>
          <p className="text-sm text-zinc-400 mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} attendeeCount={counts[i]} />
          ))}
        </div>
      )}
    </div>
  );
}
