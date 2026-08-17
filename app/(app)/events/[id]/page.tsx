"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShareOnLinkedInButton } from "@/components/share-on-linkedin-button";
import { buildLinkedInShareText } from "@/lib/linkedin-share-text";
import { getRsvpAudienceCount, emailRsvps } from "./email-rsvps-actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatInZone, localZone } from "@/lib/timezone";
import {
  CalendarDays,
  MapPin,
  Monitor,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
  Lock,
  PartyPopper,
  Mail,
  Video,
  FileText,
} from "lucide-react";
import type { Event, Profile } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/format-price";

type PaidEvent = Event & {
  is_paid: boolean;
  price: number | null;
  currency: string;
  recording_url: string | null;
};

type RegistrationStatus = "none" | "pending" | "completed" | "refunded" | "cancelled";

// Shows the event time in its own timezone (with label) plus the viewer's
// local equivalent when their zone differs — so anyone can schedule correctly.
function EventWhen({ event }: { event: PaidEvent }) {
  const tz = event.timezone || "America/New_York";
  const start = formatInZone(event.event_date, tz, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
  const end = event.end_date
    ? formatInZone(event.end_date, tz, {
        weekday: undefined, year: undefined, month: undefined, day: undefined,
        hour: "numeric", minute: "2-digit",
      })
    : null;

  const viewer = localZone();
  const showLocal = viewer !== tz;
  const localStart = showLocal
    ? formatInZone(event.event_date, viewer, {
        weekday: "short", year: undefined, month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <CalendarDays className="size-4" />
        {start}{end ? ` – ${end}` : ""}
      </span>
      {localStart && (
        <span className="pl-[22px] text-xs text-zinc-400">Your time: {localStart}</span>
      )}
    </span>
  );
}

// Resolve an event's format from is_virtual + event_type. is_virtual is the
// field the forms actually set, so it wins; event_type only distinguishes
// hybrid. (Older rows have event_type stuck at its 'in_person' default even
// when is_virtual is true — this keeps the badge honest regardless.)
function eventFormat(isVirtual?: boolean, eventType?: string): 'virtual' | 'hybrid' | 'in_person' {
  if (eventType === 'hybrid') return 'hybrid'
  if (isVirtual || eventType === 'webinar') return 'virtual'
  return 'in_person'
}

function EventTypeBadge({ isVirtual, eventType }: { isVirtual?: boolean; eventType?: string }) {
  const map = {
    virtual: { label: '🎥 Virtual', className: 'bg-teal-50 text-teal-700 border border-teal-200' },
    hybrid: { label: '🔀 Hybrid', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
    in_person: { label: '📍 In Person', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  }
  const c = map[eventFormat(isVirtual, eventType)]
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inPersonLocationText(e: any): string {
  return [e.venue_name, e.location].filter(Boolean).join(', ')
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGoogleCalendarUrl(e: any): string {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  const p = new URLSearchParams({ action:'TEMPLATE', text: e.title??'', dates:`${fmt(e.event_date)}/${fmt(e.end_date??e.event_date)}`, details: e.description??'', location: e.is_virtual?(e.virtual_url??'Online'):inPersonLocationText(e) })
  return `https://calendar.google.com/calendar/render?${p}`
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildIcalDataUri(e: any): string {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:${e.title??''}\r\nDTSTART:${fmt(e.event_date)}\r\nDTEND:${fmt(e.end_date??e.event_date)}\r\nDESCRIPTION:${(e.description??'').slice(0,200)}\r\nLOCATION:${e.is_virtual?(e.virtual_url??'Online'):inPersonLocationText(e)}\r\nEND:VEVENT\r\nEND:VCALENDAR`
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// Shown to anyone who isn't a TALK member yet — the landing page behind
// shared event links (LinkedIn, direct invites, etc.). Registering routes
// through /signup with the event attached, so approval drops them straight
// back onto this event instead of the generic dashboard.
function PublicEventTeaser({ event, eventId }: { event: PaidEvent; eventId: string }) {
  const isPaid = event.is_paid && event.price != null;
  const signupHref = `/signup?event=${eventId}&title=${encodeURIComponent(event.title)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/events/${eventId}`)}`;

  return (
    <div className="min-h-screen" style={{ background: "#F5F8FC" }}>
      {event.image_url && (
        <div className="relative w-full aspect-[16/6] overflow-hidden bg-zinc-100">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-contain" />
        </div>
      )}
      <div className="max-w-2xl mx-auto p-6 pt-10 space-y-6">
        <div
          className="rounded-2xl p-6 text-white text-center space-y-2"
          style={{ background: "linear-gradient(160deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)" }}
        >
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#93C5FD" }}>
            You&apos;re invited
          </p>
          <h1 className="text-2xl font-bold">{event.title}</h1>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <EventTypeBadge isVirtual={event.is_virtual} />
            {isPaid && (
              <span
                className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full text-white"
                style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
              >
                <CreditCard className="size-3.5" />
                {formatPrice(event.price!, event.currency)}
              </span>
            )}
          </div>

          <EventWhen event={event} />

          {!event.is_virtual && (event.venue_name || event.location) && (
            <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0 mt-0.5" />
              <span>
                {event.venue_name && <span className="font-semibold text-foreground block">{event.venue_name}</span>}
                {event.location}
              </span>
            </span>
          )}

          {event.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
          )}

          <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(232,80,58,0.06)" }}>
            <p className="text-sm font-semibold text-zinc-800">
              🎉 We&apos;re excited you want to join us! TALK is a private, invite-only community —
              apply below and we&apos;ll get you set up for this event.
            </p>
            <a
              href={signupHref}
              className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:scale-[1.01]"
              style={{ background: "#E8503A" }}
            >
              Register — Apply to Join TALK
            </a>
          </div>

          <p className="text-sm text-zinc-500 text-center">
            Already a member?{" "}
            <a href={loginHref} className="font-semibold hover:underline" style={{ color: "#1E4B82" }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Admin-only — emails everyone who's going (RSVP'd for free events,
// completed registration for paid ones). Never rendered for non-admins.
function EmailRsvpsButton({ eventId, isPaid }: { eventId: string; isPaid: boolean }) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getRsvpAudienceCount(eventId, isPaid).then((r) => setAudience(r.total));
  }, [open, eventId, isPaid]);

  async function handleSend() {
    setLoading(true);
    try {
      const result = await emailRsvps(eventId, isPaid, subject, body);
      if (result.ok) {
        toast.success(`Sent to ${result.sent} attendee${result.sent === 1 ? "" : "s"}`);
        setOpen(false);
        setSubject("");
        setBody("");
      } else {
        toast.error(result.error ?? "Failed to send.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Mail className="size-4" />
        Email RSVPs
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email everyone going</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {audience === null ? "Loading audience…" : `Sends to ${audience} attendee${audience === 1 ? "" : "s"}.`}
          </p>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            placeholder="Message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
          />
          <DialogFooter>
            <Button type="button" onClick={handleSend} disabled={loading || !subject.trim() || !body.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [event, setEvent] = useState<PaidEvent | null>(null);
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "not_going" | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>("none");
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendees'|'conversation'>('attendees');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [materials, setMaterials] = useState<{ id: string; title: string; file_url: string }[]>([]);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    if (!user) {
      // Not signed in — RLS blocks a direct read, and there's nothing else
      // (RSVPs, posts, registration) to show anyway. Fetch just the public
      // teaser fields through the service-role-backed route instead.
      const res = await fetch(`/api/events/${params.id}/public`);
      if (res.ok) {
        setEvent((await res.json()) as PaidEvent);
      }
      setLoading(false);
      return;
    }

    const [eventResult, rsvpsResult, profileResult, materialsResult] = await Promise.all([
      db.from("events").select("*").eq("id", params.id).single(),
      supabase
        .from("event_rsvps")
        .select("*, profiles(*)")
        .eq("event_id", params.id)
        .eq("status", "going"),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      db.from("event_materials").select("id, title, file_url").eq("event_id", params.id).order("created_at", { ascending: true }),
    ]);

    setEvent(eventResult.data as PaidEvent);
    setIsAdmin(profileResult.data?.role === "admin");
    setMaterials(materialsResult.data ?? []);

    if (rsvpsResult.data) {
      const attendeeProfiles = rsvpsResult.data
        .map((r: { profiles: Profile | null }) => r.profiles)
        .filter((p: Profile | null): p is Profile => p !== null);
      setAttendees(attendeeProfiles);

      if (user) {
        const myRsvp = rsvpsResult.data.find((r: { user_id: string }) => r.user_id === user.id);
        setRsvpStatus(myRsvp ? (myRsvp.status as "going" | "not_going") : null);
      }
    }

    // Check paid registration status
    if (user && eventResult.data?.is_paid) {
      const { data: reg } = await db
        .from("event_registrations")
        .select("status")
        .eq("event_id", params.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setRegistrationStatus((reg?.status as RegistrationStatus) ?? "none");
    }

    const postsResult = await db.from('event_posts').select('*, profiles(*)').eq('event_id', params.id).order('created_at', { ascending: true });
    setPosts(postsResult.data ?? []);

    setLoading(false);
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = async () => {
    if (!currentUserId || !event || !postContent.trim()) return;
    setPostLoading(true);
    const { data, error } = await db.from('event_posts').insert({
      event_id: event.id,
      author_id: currentUserId,
      content: postContent.trim(),
    }).select('*, profiles(*)').single();
    if (!error && data) {
      setPosts((prev) => [...prev, data]);
      setPostContent('');
    }
    setPostLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for registration completion right after Stripe redirect
  useEffect(() => {
    if (!justRegistered || registrationStatus === "completed") return;
    const interval = setInterval(async () => {
      if (!currentUserId) return;
      const { data: reg } = await db
        .from("event_registrations")
        .select("status")
        .eq("event_id", params.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (reg?.status === "completed") {
        setRegistrationStatus("completed");
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [justRegistered, registrationStatus, currentUserId, params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRsvp = async () => {
    if (!currentUserId || !event) return;
    setRsvpLoading(true);
    if (rsvpStatus === "going") {
      await supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", currentUserId);
      setRsvpStatus(null);
      setAttendees((prev) => prev.filter((a) => a.id !== currentUserId));
    } else {
      const { error } = await supabase.from("event_rsvps").upsert({
        event_id: event.id,
        user_id: currentUserId,
        status: "going",
      });
      if (!error) {
        setRsvpStatus("going");
        const { data: profile } = await supabase
          .from("profiles").select("*").eq("id", currentUserId).single();
        if (profile) setAttendees((prev) => [...prev, profile]);
      }
    }
    setRsvpLoading(false);
  };

  const handleCheckout = async () => {
    if (!event) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Something went wrong. Please try again.");
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!event) {
    return <div className="p-6 text-muted-foreground">Event not found.</div>;
  }

  if (!currentUserId) {
    return <PublicEventTeaser event={event} eventId={params.id} />;
  }

  const isPast = new Date(event.event_date) < new Date();
  const isPaid = event.is_paid && event.price != null;
  const isRegistered = registrationStatus === "completed";

  const mapsQuery = [event.venue_name, event.location].filter(Boolean).join(", ");
  const mapsHref = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Hero — brand gradient always, event photo layered on top when there is one */}
      <div
        className="relative w-full aspect-[16/7] overflow-hidden flex items-end"
        style={{ background: "linear-gradient(160deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)" }}
      >
        {event.image_url && (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-contain" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative w-full p-6 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <EventTypeBadge isVirtual={event.is_virtual} eventType={(event as any)?.event_type} />
            {isPaid && (
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
              >
                <CreditCard className="size-3.5" />
                {formatPrice(event.price!, event.currency)}
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white/80 backdrop-blur-sm">
                Past
              </span>
            )}
            {isRegistered && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-300 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="size-3.5" /> Registered
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-poppins), system-ui" }}>
            {event.title}
          </h1>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Post-payment success banner */}
        {justRegistered && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3 text-white"
            style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
          >
            <PartyPopper className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Payment successful — you&apos;re in!</p>
              {isRegistered ? (
                <p className="text-sm text-white/80 mt-0.5">
                  Your virtual link is ready below.
                </p>
              ) : (
                <p className="text-sm text-white/80 mt-0.5">
                  Confirming your registration… the virtual link will appear in a moment.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-zinc-600">
            <EventWhen event={event} />
            <span className="flex items-center gap-1.5">
              {event.is_virtual ? (
                <><Monitor className="size-4 text-zinc-400" /> Virtual event</>
              ) : (
                <><MapPin className="size-4 text-zinc-400" /> {event.venue_name ?? event.location ?? "Location TBD"}</>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-zinc-400" />
              {attendees.length} going
              {event.max_attendees && ` / ${event.max_attendees} max`}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <a href={buildGoogleCalendarUrl(event as any)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"><CalendarDays className="size-3.5"/>Add to Google Calendar</a>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <a href={buildIcalDataUri(event as any)} download={`${event.title}.ics`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"><CalendarDays className="size-3.5"/>Add to iCal</a>
          </div>

          {event.description && (
            <p className="text-muted-foreground leading-relaxed border-t border-zinc-100 pt-4 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>

        {/* How to join — the actual access info, front and center */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#DDE6F0" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ background: "#F5F8FC", borderColor: "#DDE6F0" }}>
            {event.is_virtual ? <Monitor className="size-4" style={{ color: "#1E4B82" }} /> : <MapPin className="size-4" style={{ color: "#1E4B82" }} />}
            <p className="text-sm font-bold" style={{ color: "#0F1F35" }}>How to join</p>
          </div>

          <div className="p-5 space-y-4 bg-white">
            {/* Virtual access */}
            {event.is_virtual && (
              event.virtual_url && (!isPaid || isRegistered) ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Your virtual link is ready</p>
                    {isPaid && <p className="text-xs text-emerald-600 mt-0.5">Only visible to registered attendees</p>}
                  </div>
                  <Button
                    className="text-white shrink-0"
                    style={{ background: "#0d9488" }}
                    render={<a href={event.virtual_url} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink className="size-4" />
                    {isPaid ? "Join Class" : "Join Virtual Event"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center gap-3 text-zinc-500">
                  <Lock className="size-4 shrink-0" />
                  <p className="text-sm">The virtual link unlocks once you register{isPaid ? " and pay" : ""}.</p>
                </div>
              )
            )}

            {/* In-person / hybrid location */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {!event.is_virtual || (event as any)?.event_type === "hybrid" ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1E4B8215" }}>
                    <MapPin className="size-4" style={{ color: "#1E4B82" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      {event.venue_name ?? event.location ?? "Location TBD"}
                    </p>
                    {event.venue_name && event.location && (
                      <p className="text-xs text-zinc-500 mt-0.5">{event.location}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-0.5">Arrive any time after the start — no check-in link needed</p>
                  </div>
                </div>
                {mapsHref && (
                  <Button variant="outline" size="sm" render={<a href={mapsHref} target="_blank" rel="noopener noreferrer" />}>
                    <ExternalLink className="size-3.5" />
                    Get Directions
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Recording & materials — shows up once an admin's added either */}
        {(event.recording_url || materials.length > 0) && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#DDE6F0" }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ background: "#F5F8FC", borderColor: "#DDE6F0" }}>
              <Video className="size-4" style={{ color: "#1E4B82" }} />
              <p className="text-sm font-bold" style={{ color: "#0F1F35" }}>Recording &amp; materials</p>
            </div>
            <div className="p-5 space-y-3 bg-white">
              {event.recording_url && (
                <Button
                  className="text-white"
                  style={{ background: "#0d9488" }}
                  render={<a href={event.recording_url} target="_blank" rel="noopener noreferrer" />}
                >
                  <Video className="size-4" />
                  Watch the Recording
                </Button>
              )}
              {materials.length > 0 && (
                <ul className="space-y-2">
                  {materials.map((m) => (
                    <li key={m.id}>
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-zinc-700 hover:text-[#1E4B82] transition-colors"
                      >
                        <FileText className="size-4 text-zinc-400" />
                        {m.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {!isPast && !isPaid && (
            <Button
              onClick={handleRsvp}
              disabled={rsvpLoading || !currentUserId}
              variant={rsvpStatus === "going" ? "outline" : "default"}
            >
              {rsvpStatus === "going" ? (
                <><XCircle className="size-4" /> Cancel RSVP</>
              ) : (
                <><CheckCircle2 className="size-4" /> RSVP — I&apos;m Going</>
              )}
            </Button>
          )}

          {!isPast && isPaid && !isRegistered && currentUserId && (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-70 transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #E8503A, #F07058)", color: "#0d0d0d" }}
            >
              {checkoutLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Redirecting to checkout…</>
              ) : (
                <><CreditCard className="size-4" /> Register — {formatPrice(event.price!, event.currency)}</>
              )}
            </button>
          )}
          <ShareOnLinkedInButton
            defaultText={buildLinkedInShareText(
              `${event.title}\n\n${typeof window !== "undefined" ? window.location.href : ""}`
            )}
            card={{
              eyebrow: "Event",
              title: event.title,
              subtitle: `${format(new Date(event.event_date), "MMM d, yyyy")} · ${event.is_virtual ? "Virtual" : (event.venue_name ?? event.location ?? "In Person")}`,
            }}
          />
          {isAdmin && <EmailRsvpsButton eventId={event.id} isPaid={isPaid} />}
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 border-b border-zinc-100 -mx-6 -mt-6 px-6 pt-1">
              <button
                onClick={() => setActiveTab('attendees')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab==='attendees' ? 'border-[#F07058] text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                {isPaid ? "Registrations" : "Attendees"} ({attendees.length})
              </button>
              <button
                onClick={() => setActiveTab('conversation')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab==='conversation' ? 'border-[#F07058] text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                Conversation ({posts.length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'attendees' ? (
              attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has signed up yet.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-2">
                      <Avatar size="sm">
                        {attendee.avatar_url && (
                          <AvatarImage src={attendee.avatar_url} alt={attendee.full_name ?? ""} />
                        )}
                        <AvatarFallback>{getInitials(attendee.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{attendee.full_name}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posts yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div key={post.id} className="flex items-start gap-3">
                        <Avatar size="sm">
                          {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} alt={post.profiles?.full_name ?? ''} />}
                          <AvatarFallback>{getInitials(post.profiles?.full_name ?? null)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-zinc-50 rounded-2xl px-4 py-2.5">
                          <p className="text-sm font-semibold text-zinc-900">{post.profiles?.full_name ?? 'Unknown'}</p>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{post.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {currentUserId && (
                  <div className="flex gap-2 pt-2 border-t border-zinc-100">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Share a thought about this event…"
                      rows={2}
                      className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
                    />
                    <Button onClick={handlePost} disabled={postLoading || !postContent.trim()}>
                      {postLoading ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
