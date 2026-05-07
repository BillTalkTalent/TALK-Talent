"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import type { Event, Profile } from "@/lib/supabase/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "not_going" | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const [eventResult, rsvpsResult] = await Promise.all([
      supabase.from("events").select("*").eq("id", params.id).single(),
      supabase
        .from("event_rsvps")
        .select("*, profiles(*)")
        .eq("event_id", params.id)
        .eq("status", "going"),
    ]);

    setEvent(eventResult.data);

    if (rsvpsResult.data) {
      const attendeeProfiles = rsvpsResult.data
        .map((r) => r.profiles as Profile | null)
        .filter((p): p is Profile => p !== null);
      setAttendees(attendeeProfiles);

      if (user) {
        const myRsvp = rsvpsResult.data.find((r) => r.user_id === user.id);
        setRsvpStatus(myRsvp ? (myRsvp.status as "going" | "not_going") : null);
      }
    }

    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .single();
        if (profile) setAttendees((prev) => [...prev, profile]);
      }
    }
    setRsvpLoading(false);
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <div className="flex gap-2 shrink-0">
            {event.is_virtual ? (
              <Badge variant="secondary">Virtual</Badge>
            ) : (
              <Badge variant="outline">In Person</Badge>
            )}
            {isPast && <Badge variant="outline">Past</Badge>}
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

        <div className="flex gap-2 flex-wrap">
          {!isPast && (
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
          {event.is_virtual && event.virtual_url && (
            <Button variant="outline" render={<a href={event.virtual_url} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-4" />
              Join Virtual Event
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Attendees ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has RSVP&apos;d yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-2">
                  <Avatar size="sm">
                    {attendee.avatar_url && (
                      <AvatarImage src={attendee.avatar_url} alt={attendee.full_name ?? ""} />
                    )}
                    <AvatarFallback>
                      {getInitials(attendee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{attendee.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
