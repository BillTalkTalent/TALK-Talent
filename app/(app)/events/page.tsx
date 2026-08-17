import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, MapPin, Monitor, Users, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { formatInZone, utcToZonedInputValue } from "@/lib/timezone";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format as formatDate,
  isSameMonth,
  isToday,
} from "date-fns";
import type { Event } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-price";

type PaidEvent = Event & { is_paid: boolean; price: number | null; currency: string };

async function getAttendeeCountMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const { data } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "going");
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.event_id] = (map[row.event_id] ?? 0) + 1;
  }
  return map;
}

function EventCard({ event, attendeeCount }: { event: PaidEvent; attendeeCount: number }) {
  const tz = event.timezone || "America/New_York";
  const dateLabel = formatInZone(event.event_date, tz, {
    weekday: undefined, month: "short", day: "numeric", year: "numeric",
    hour: undefined, minute: undefined, timeZoneName: undefined,
  });
  // Time with zone label, e.g. "2:00 PM EDT"
  const timeLabel = formatInZone(event.event_date, tz, {
    weekday: undefined, year: undefined, month: undefined, day: undefined,
    hour: "numeric", minute: "2-digit",
  });
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
              {dateLabel}
            </span>
            <div className="flex items-center gap-1.5">
              {event.is_paid && event.price != null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#E8503A] px-2.5 py-1 rounded-full">
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

          <div className="flex items-center gap-2 mb-1">
            {event.is_paid ? (
              <span className="text-[10px] font-black uppercase tracking-wide text-white bg-[#E8503A] px-2 py-0.5 rounded-full">Class</span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wide text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20 px-2 py-0.5 rounded-full">Event</span>
            )}
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
                <><Monitor className="size-3" /> Virtual · {timeLabel}</>
              ) : (
                <><MapPin className="size-3" /> {event.venue_name ?? event.location ?? "TBD"} · {timeLabel}</>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">
              <Users className="size-3" /> {attendeeCount} going
            </span>
          </div>
          <div className="mt-2">
            {(() => { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ const t=(event as any).event_type; const fmt = t==='hybrid'?'🔀 Hybrid':(event.is_virtual||t==='webinar')?'🎥 Virtual':'📍 In Person'; return <span className="text-xs text-zinc-400">{fmt}</span> })()}
          </div>
        </div>
      </div>
    </Link>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Local calendar date (YYYY-MM-DD) an event falls on in its own timezone —
// not UTC, so a 9pm PT event doesn't appear a day late for everyone else.
function eventDayKey(event: PaidEvent): string {
  return utcToZonedInputValue(event.event_date, event.timezone || "America/New_York").slice(0, 10);
}

function MonthCalendar({ monthParam, events }: { monthParam: string; events: PaidEvent[] }) {
  const monthDate = /^\d{4}-\d{2}$/.test(monthParam) ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = new Map<string, PaidEvent[]>();
  for (const event of events) {
    const key = eventDayKey(event);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  const prevMonthHref = `/events?tab=calendar&month=${formatDate(subMonths(monthStart, 1), "yyyy-MM")}`;
  const nextMonthHref = `/events?tab=calendar&month=${formatDate(addMonths(monthStart, 1), "yyyy-MM")}`;

  return (
    <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <h2 className="text-base font-bold text-zinc-900">{formatDate(monthStart, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <Link href={prevMonthHref} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={`/events?tab=calendar&month=${formatDate(new Date(), "yyyy-MM")}`} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            Today
          </Link>
          <Link href={nextMonthHref} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-100">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = formatDate(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`min-h-[104px] border-b border-r border-zinc-50 p-1.5 last:border-r-0 ${inMonth ? "bg-white" : "bg-zinc-50/50"}`}
            >
              <span
                className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-semibold ${
                  today ? "bg-[#f97316] text-white" : inMonth ? "text-zinc-700" : "text-zinc-300"
                }`}
              >
                {formatDate(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={`block truncate text-[11px] font-medium px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity ${
                      event.is_paid
                        ? "bg-[#E8503A]/10 text-[#E8503A]"
                        : "bg-[#f97316]/10 text-[#ea580c]"
                    }`}
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block text-[10px] font-semibold text-zinc-400 px-1.5">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { tab, month } = await searchParams;
  const activeTab = tab === "past" ? "past" : tab === "calendar" ? "calendar" : "upcoming";
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("is_test", false)
      .gte("event_date", now)
      .order("event_date", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("is_test", false)
      .lt("event_date", now)
      .order("event_date", { ascending: false })
      .limit(20),
  ]);

  const upcomingEvents = (upcomingResult.data ?? []) as PaidEvent[];
  const pastEvents = (pastResult.data ?? []) as PaidEvent[];

  const allEventIds = [...upcomingEvents, ...pastEvents].map((e) => e.id);
  const attendeeCountMap = await getAttendeeCountMap(supabase, allEventIds);

  const events = activeTab === "upcoming" ? upcomingEvents : activeTab === "past" ? pastEvents : [];

  // Calendar tab fetches its own range — the visible month can reach outside
  // both the "upcoming" and (capped) "past" windows above.
  const monthParam = /^\d{4}-\d{2}$/.test(month ?? "") ? (month as string) : formatDate(new Date(), "yyyy-MM");
  let calendarEvents: PaidEvent[] = [];
  if (activeTab === "calendar") {
    const monthDate = new Date(`${monthParam}-01T00:00:00`);
    const gridStart = startOfWeek(startOfMonth(monthDate));
    const gridEnd = endOfWeek(endOfMonth(monthDate));
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("is_test", false)
      .gte("event_date", gridStart.toISOString())
      .lte("event_date", gridEnd.toISOString())
      .order("event_date", { ascending: true });
    calendarEvents = (data ?? []) as PaidEvent[];
  }

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
            <h1 className="text-xl font-bold text-zinc-900">Events &amp; Classes</h1>
            <p className="text-sm text-zinc-500">Community gatherings, meetups, and paid classes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl w-fit">
        <TabButton href="/events?tab=upcoming" label={`Upcoming (${upcomingEvents.length})`} active={activeTab === "upcoming"} />
        <TabButton href="/events?tab=past" label={`Past (${pastEvents.length})`} active={activeTab === "past"} />
        <TabButton href="/events?tab=calendar" label="Calendar" active={activeTab === "calendar"} />
      </div>

      {activeTab === "calendar" ? (
        <MonthCalendar monthParam={monthParam} events={calendarEvents} />
      ) : events.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-16 text-center">
          <CalendarDays className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No {activeTab} events</p>
          <p className="text-sm text-zinc-400 mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} attendeeCount={attendeeCountMap[event.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
