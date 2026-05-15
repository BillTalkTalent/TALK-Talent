import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
  BarChart2,
  Clock,
  Bell,
} from "lucide-react";
import GettingStartedCard from "@/components/getting-started-card";
import ForumFeed, { type FeedTopic } from "@/components/forum-feed";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [
    profileResult,
    eventsResult,
    jobsResult,
    memberCountResult,
    eventCountResult,
    activeTopicsCountResult,
    jobCountResult,
    rsvpResults,
    myForumPostsResult,
    myRsvpResult,
    myChapterMembershipsResult,
    trendingTopicsResult,
    recentRepliesResult,
    activePollsResult,
    allPollVotesResult,
    myPollVotesResult,
    unreadNotificationsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user?.id ?? "").single(),
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(4),
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
    supabase
      .from("forum_topics")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user?.id ?? ""),
    supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? ""),
    // User's chapter memberships
    supabase
      .from("chapter_memberships")
      .select("chapter_id")
      .eq("user_id", user?.id ?? ""),
    // Trending topics: most viewed in last 14 days
    supabase
      .from("forum_topics")
      .select("id, title, created_at, views, author_id, profiles(full_name), forum_categories(name, slug)")
      .gte("created_at", twoWeeksAgo.toISOString())
      .order("views", { ascending: false })
      .limit(8),
    // Recent replies to compute reply counts
    supabase
      .from("forum_replies")
      .select("topic_id")
      .gte("created_at", twoWeeksAgo.toISOString()),
    // Active polls
    supabase
      .from("polls")
      .select("id, question, closes_at, status")
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(5),
    // Total vote counts per poll (all users)
    supabase
      .from("poll_votes")
      .select("poll_id"),
    // Which polls the current user has voted on
    supabase
      .from("poll_votes")
      .select("poll_id")
      .eq("user_id", user?.id ?? ""),
    // Unread notifications count
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? "")
      .eq("is_read", false),
  ]);

  const unreadCount = unreadNotificationsResult.count ?? 0;

  // Build reply count map
  const replyCounts: Record<string, number> = {};
  for (const r of recentRepliesResult.data ?? []) {
    replyCounts[r.topic_id] = (replyCounts[r.topic_id] ?? 0) + 1;
  }

  // "My Chapters" feed: get chapter-mates then their recent posts
  const myChapterIds = (myChapterMembershipsResult.data ?? []).map(m => m.chapter_id);
  const hasChapters = myChapterIds.length > 0;
  let chapterTopics: FeedTopic[] = [];

  if (hasChapters) {
    const { data: chapterMates } = await supabase
      .from("chapter_memberships")
      .select("user_id")
      .in("chapter_id", myChapterIds)
      .neq("user_id", user?.id ?? "");

    const chapterMateIds = [...new Set((chapterMates ?? []).map(m => m.user_id))];

    if (chapterMateIds.length > 0) {
      const { data: feed } = await supabase
        .from("forum_topics")
        .select("id, title, created_at, views, author_id, profiles(full_name), forum_categories(name, slug)")
        .in("author_id", chapterMateIds)
        .order("created_at", { ascending: false })
        .limit(8);

      chapterTopics = (feed ?? []).map(t => ({
        id: t.id,
        title: t.title,
        category: t.forum_categories as { name: string; slug: string } | null,
        author: t.profiles as { full_name: string | null } | null,
        created_at: t.created_at,
        views: t.views ?? 0,
        replyCount: replyCounts[t.id] ?? 0,
      }));
    }
  }

  // Trending topics: re-sort by replies + views combined
  const trendingTopics: FeedTopic[] = (trendingTopicsResult.data ?? [])
    .map(t => ({
      id: t.id,
      title: t.title,
      category: t.forum_categories as { name: string; slug: string } | null,
      author: t.profiles as { full_name: string | null } | null,
      created_at: t.created_at,
      views: t.views ?? 0,
      replyCount: replyCounts[t.id] ?? 0,
    }))
    .sort((a, b) => (b.replyCount * 3 + b.views) - (a.replyCount * 3 + a.views))
    .slice(0, 6);

  const profile = profileResult.data;
  const upcomingEvents = eventsResult.data ?? [];
  const recentJobs = jobsResult.data ?? [];
  const memberCount = memberCountResult.count ?? 0;
  const upcomingEventCount = eventCountResult.count ?? 0;
  const activeDiscussionsCount = activeTopicsCountResult.count ?? 0;
  const jobsPostedCount = jobCountResult.count ?? 0;
  const allRsvps = rsvpResults.data ?? [];

  // Active polls — exclude any past closes_at even if status is still "open"
  type PollEntry = { id: string; question: string; closes_at: string | null; status: string };
  const activePolls = ((activePollsResult.data ?? []) as PollEntry[]).filter(
    (p) => !p.closes_at || new Date(p.closes_at) > new Date()
  );
  // Vote counts per poll (all users)
  const pollVoteCountMap: Record<string, number> = {};
  for (const v of allPollVotesResult.data ?? []) {
    pollVoteCountMap[v.poll_id] = (pollVoteCountMap[v.poll_id] ?? 0) + 1;
  }
  // Which polls the current user has voted on
  const myVotedPollIds = new Set((myPollVotesResult.data ?? []).map((v) => v.poll_id));
  const unvotedCount = activePolls.filter((p) => !myVotedPollIds.has(p.id)).length;

  // Getting-started checklist
  const hasPhoto = !!profile?.avatar_url;
  const hasBio = !!profile?.bio;
  const hasPosted = (myForumPostsResult.count ?? 0) > 0;
  const hasRsvpd = (myRsvpResult.count ?? 0) > 0;
  const hasJoinedChapter = hasChapters;

  const gettingStartedItems = [
    {
      key: 'photo',
      label: 'Add a profile photo',
      desc: 'Put a face to your name so members recognise you.',
      href: '/profile',
      done: hasPhoto,
    },
    {
      key: 'bio',
      label: 'Write a short bio',
      desc: 'Tell the community what you do and what you care about.',
      href: '/profile',
      done: hasBio,
    },
    {
      key: 'chapter',
      label: 'Join a chapter',
      desc: 'Connect with members who share your focus area.',
      href: '/chapters',
      done: hasJoinedChapter,
    },
    {
      key: 'forum',
      label: 'Introduce yourself in the forum',
      desc: 'Start a post — say hi and share what you\'re working on.',
      href: '/forum',
      done: hasPosted,
    },
    {
      key: 'rsvp',
      label: 'RSVP to your first event',
      desc: 'Browse upcoming events and reserve your spot.',
      href: '/events',
      done: hasRsvpd,
    },
  ];

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

      {unreadCount > 0 && (
        <Link
          href="/notifications"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-5 py-3 hover:bg-[#00d4aa]/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-[#00b894]" />
            <p className="text-sm font-semibold text-zinc-900">
              You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </p>
          </div>
          <ArrowRight className="size-4 text-[#00b894]" />
        </Link>
      )}

      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 55%, #16213e 100%)" }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
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

      {/* Getting started checklist — shown until all items done + dismissed */}
      <GettingStartedCard items={gettingStartedItems} />

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

      {/* Community Activity Feed — full width */}
      <ForumFeed
        chapterTopics={chapterTopics}
        trendingTopics={trendingTopics}
        hasChapters={hasChapters}
      />

      {/* Two-column content grid — single column when no polls */}
      <div className={`grid gap-5 ${activePolls.length > 0 ? "lg:grid-cols-2" : ""}`}>

        {/* Active Polls — left column, only shown when polls exist */}
        {activePolls.length > 0 ? (
          <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
                  <BarChart2 className="size-3.5 text-[#8b5cf6]" />
                </div>
                <span className="text-sm font-semibold text-zinc-900">Active Polls</span>
                {unvotedCount > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    {unvotedCount} need{unvotedCount === 1 ? "s" : ""} your vote
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-[#00b894] hover:text-[#00d4aa] hover:bg-[#00d4aa]/10 -mr-1" render={<Link href="/polls" />}>
                View all <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-zinc-50">
              {activePolls.map((poll) => {
                const hasVoted = myVotedPollIds.has(poll.id);
                const totalVotes = pollVoteCountMap[poll.id] ?? 0;
                return (
                  <Link
                    key={poll.id}
                    href={`/polls/${poll.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className={`size-2 rounded-full shrink-0 ${hasVoted ? "bg-zinc-200" : "bg-[#8b5cf6]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm truncate transition-colors ${hasVoted ? "text-zinc-500 group-hover:text-zinc-700" : "text-zinc-900 group-hover:text-[#8b5cf6]"}`}>
                        {poll.question}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                        </span>
                        {poll.closes_at && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Closes {format(new Date(poll.closes_at), "MMM d")}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    {hasVoted ? (
                      <span className="shrink-0 text-xs font-semibold text-zinc-400 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-full">
                        Voted ✓
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-bold text-white bg-[#8b5cf6] hover:bg-[#7c3aed] px-3 py-1.5 rounded-full transition-colors">
                        Vote →
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

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
