import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import {
  Users,
  CalendarDays,
  MessageSquare,
  Briefcase,
  MapPin,
  Monitor,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    profileResult,
    eventsResult,
    topicsResult,
    jobsResult,
    memberCountResult,
    eventCountResult,
    activeTopicsCountResult,
    jobCountResult,
    rsvpResults,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user?.id ?? "").single(),
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(3),
    supabase
      .from("forum_topics")
      .select("*, profiles(full_name), forum_categories(name, slug)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("job_posts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("event_date", new Date().toISOString()),
    supabase
      .from("forum_topics")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("status", "going"),
  ]);

  const profile = profileResult.data;
  const upcomingEvents = eventsResult.data ?? [];
  const recentTopics = topicsResult.data ?? [];
  const recentJobs = jobsResult.data ?? [];
  const memberCount = memberCountResult.count ?? 0;
  const upcomingEventCount = eventCountResult.count ?? 0;
  const activeDiscussionsCount = activeTopicsCountResult.count ?? 0;
  const jobsPostedCount = jobCountResult.count ?? 0;
  const allRsvps = rsvpResults.data ?? [];

  const rsvpCountMap: Record<string, number> = {};
  for (const rsvp of allRsvps) {
    rsvpCountMap[rsvp.event_id] = (rsvpCountMap[rsvp.event_id] ?? 0) + 1;
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      label: "Total Members",
      value: memberCount,
      icon: Users,
      style: { background: "linear-gradient(135deg, #00b894, #00d4aa)" },
      href: "/members",
    },
    {
      label: "Upcoming Events & Classes",
      value: upcomingEventCount,
      icon: CalendarDays,
      style: { background: "linear-gradient(135deg, #ea580c, #f97316)" },
      href: "/events",
    },
    {
      label: "Active Discussions",
      value: activeDiscussionsCount,
      icon: MessageSquare,
      style: { background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" },
      href: "/forum",
    },
    {
      label: "Jobs Posted",
      value: jobsPostedCount,
      icon: Briefcase,
      style: { background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" },
      href: "/jobs",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)" }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Glowing orb */}
        <div className="absolute -top-10 -right-10 size-48 rounded-full opacity-20 blur-3xl" style={{background: "radial-gradient(circle, #00d4aa, transparent)"}} />
        <div className="relative">
          <p className="text-sm font-medium text-[#00d4aa]/80 mb-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-white/60 mt-1.5 text-sm max-w-md">
            Here&apos;s what&apos;s happening in the TALK community today.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => { const { label, value, icon: Icon, href } = stat; return (
          <Link key={label} href={href}>
            <div className="relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-150" style={stat.style}>
              <Icon className="absolute right-4 top-4 size-8 text-white/20" />
              <p className="text-4xl font-black leading-none">{value.toLocaleString()}</p>
              <p className="mt-2 text-sm text-white/75 font-medium">{label}</p>
            </div>
          </Link>
        )})}
      </div>

      {/* Two-column content grid */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Upcoming Events */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
                <CalendarDays className="size-3.5 text-[#f97316]" />
              </div>
              <span className="text-sm font-semibold text-zinc-900">Upcoming Events &amp; Classes</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#00b894] hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 -mr-1" render={<Link href="/events" />}>
              View all <ArrowRight className="size-3 ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-zinc-50">
            {upcomingEvents.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarDays className="size-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No upcoming events.</p>
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.event_date);
                const rsvpCount = rsvpCountMap[event.id] ?? 0;
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-indigo-700"
                      style={{background: "linear-gradient(135deg, #eef2ff, #e0e7ff)"}}>
                      <span className="text-[10px] font-bold uppercase tracking-wide leading-none text-[#f97316]">
                        {format(eventDate, "MMM")}
                      </span>
                      <span className="text-xl font-black leading-tight">
                        {format(eventDate, "d")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {(event as unknown as { is_paid: boolean }).is_paid ? (
                          <span className="text-[9px] font-black uppercase tracking-wide text-white bg-[#00b894] px-1.5 py-0.5 rounded-full shrink-0">Class</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-wide text-[#f97316] bg-[#f97316]/10 px-1.5 py-0.5 rounded-full shrink-0">Event</span>
                        )}
                        <p className="font-medium text-sm text-zinc-900 truncate group-hover:text-[#00d4aa] transition-colors">
                          {event.title}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        {event.is_virtual ? (
                          <><Monitor className="size-3" /> Virtual</>
                        ) : (
                          <><MapPin className="size-3" /> {event.location ?? "TBD"}</>
                        )}
                        <span className="mx-1">·</span>
                        {format(eventDate, "h:mm a")}
                      </p>
                    </div>
                    {rsvpCount > 0 && (
                      <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {rsvpCount} going
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Discussions */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
                <MessageSquare className="size-3.5 text-[#8b5cf6]" />
              </div>
              <span className="text-sm font-semibold text-zinc-900">Recent Discussions</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#00b894] hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 -mr-1" render={<Link href="/forum" />}>
              View all <ArrowRight className="size-3 ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-zinc-50">
            {recentTopics.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <MessageSquare className="size-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No topics yet.</p>
              </div>
            ) : (
              recentTopics.map((topic) => {
                const cat = topic.forum_categories as { name: string; slug: string } | null;
                const author = topic.profiles as { full_name: string | null } | null;
                return (
                  <Link
                    key={topic.id}
                    href={`/forum/${cat?.slug}/${topic.id}`}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      {cat && (
                        <span className="inline-block text-[10px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full border border-[#8b5cf6]/20">
                          {cat.name}
                        </span>
                      )}
                      <p className="font-medium text-sm text-zinc-900 truncate group-hover:text-[#00d4aa] transition-colors">
                        {topic.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {author?.full_name ?? "Unknown"} ·{" "}
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Job Posts */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center">
              <Briefcase className="size-3.5 text-[#3b82f6]" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">Recent Job Posts</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-[#00b894] hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 -mr-1" render={<Link href="/jobs" />}>
            View all <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
        {recentJobs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Briefcase className="size-8 text-zinc-200 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No active jobs posted.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
              >
                <div className="size-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="size-4 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-zinc-900 group-hover:text-[#00d4aa] transition-colors">
                      {job.title}
                    </p>
                    <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                      {job.job_type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    {job.company}
                    {(job.location || job.is_remote) && (
                      <>
                        <span className="mx-1">·</span>
                        <MapPin className="size-3" />
                        {job.is_remote ? "Remote" : job.location}
                      </>
                    )}
                  </p>
                </div>
                <ArrowRight className="size-4 text-zinc-300 group-hover:text-[#3b82f6] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
