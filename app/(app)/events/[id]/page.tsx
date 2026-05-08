"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
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
} from "lucide-react";
import type { Event, Profile } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/stripe";

type PaidEvent = Event & {
  is_paid: boolean;
  price: number | null;
  currency: string;
};

type RegistrationStatus = "none" | "pending" | "completed" | "refunded" | "cancelled";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
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
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "not_going" | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>("none");
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const [eventResult, rsvpsResult] = await Promise.all([
      db.from("events").select("*").eq("id", params.id).single(),
      supabase
        .from("event_rsvps")
        .select("*, profiles(*)")
        .eq("event_id", params.id)
        .eq("status", "going"),
    ]);

    setEvent(eventResult.data as PaidEvent);

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

    setLoading(false);
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isPast = new Date(event.event_date) < new Date();
  const isPaid = event.is_paid && event.price != null;
  const isRegistered = registrationStatus === "completed";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero image */}
      {event.image_url && (
        <div className="relative w-full aspect-[16/6] overflow-hidden bg-zinc-100">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-6 space-y-6">

        {/* Post-payment success banner */}
        {justRegistered && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3 text-white"
            style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
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

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900">{event.title}</h1>
            <div className="flex gap-2 flex-wrap shrink-0">
              {isPaid && (
                <span
                  className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
                >
                  <CreditCard className="size-3.5" />
                  {formatPrice(event.price!, event.currency)}
                </span>
              )}
              {event.is_virtual ? (
                <Badge variant="secondary">Virtual</Badge>
              ) : (
                <Badge variant="outline">In Person</Badge>
              )}
              {isPast && <Badge variant="outline">Past</Badge>}
              {isRegistered && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="size-3.5" /> Registered
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {format(new Date(event.event_date), "EEEE, MMMM d, yyyy · h:mm a")}
              {event.end_date && ` – ${format(new Date(event.end_date), "h:mm a")}`}
            </span>
            <span className="flex items-center gap-1.5">
              {event.is_virtual ? (
                <><Monitor className="size-4" /> Virtual event</>
              ) : (
                <><MapPin className="size-4" /> {event.location ?? "Location TBD"}</>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {attendees.length} going
              {event.max_attendees && ` / ${event.max_attendees} max`}
            </span>
          </div>

          {event.description && (
            <p className="text-muted-foreground leading-relaxed">{event.description}</p>
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
                style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)", color: "#0d0d0d" }}
              >
                {checkoutLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Redirecting to checkout…</>
                ) : (
                  <><CreditCard className="size-4" /> Register — {formatPrice(event.price!, event.currency)}</>
                )}
              </button>
            )}
          </div>

          {/* Virtual link — shown to everyone (free) or registered users only (paid) */}
          {event.is_virtual && event.virtual_url && (
            isPaid ? (
              isRegistered ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Your virtual class link</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Only visible to registered attendees</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 shrink-0"
                    render={<a href={event.virtual_url} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink className="size-4" />
                    Join Class
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center gap-3 text-zinc-500">
                  <Lock className="size-4 shrink-0" />
                  <p className="text-sm">
                    The virtual link will be unlocked after you register and pay.
                  </p>
                </div>
              )
            ) : (
              <Button
                variant="outline"
                render={<a href={event.virtual_url} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink className="size-4" />
                Join Virtual Event
              </Button>
            )
          )}
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              {isPaid ? "Registrations" : "Attendees"} ({attendees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
