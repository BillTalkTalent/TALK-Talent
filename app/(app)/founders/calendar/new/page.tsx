"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { zonedWallTimeToUTC, localZone } from "@/lib/timezone";

export default function NewFounderEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [location, setLocation] = useState("");
  const [virtualUrl, setVirtualUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && eventDate && (isVirtual ? virtualUrl.trim() : true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const tz = localZone();
    const eventDateUtc = zonedWallTimeToUTC(eventDate, tz).toISOString();
    const endDateUtc = endDate ? zonedWallTimeToUTC(endDate, tz).toISOString() : null;

    const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
    const { data: event, error } = await db
      .from("founder_events")
      .insert({
        created_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        is_virtual: isVirtual,
        location: isVirtual ? null : location.trim() || null,
        virtual_url: isVirtual ? virtualUrl.trim() : null,
        event_date: eventDateUtc,
        end_date: endDateUtc,
      })
      .select()
      .single();

    if (error || !event) {
      toast.error("Failed to post. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Event posted!");
    const eventId = (event as { id: string }).id;
    fetch("/api/founders/notify-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "event", title: title.trim(), link: `/founders/calendar/${eventId}` }),
    }).catch(() => {});
    router.push(`/founders/calendar/${eventId}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/calendar" className="hover:underline">Calendar</Link>
        <span>/</span>
        <span>New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post an event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Details (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event_date">
                  Starts <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">Ends (optional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Where</Label>
              <div className="flex gap-2">
                {([
                  { value: false, label: "In person" },
                  { value: true, label: "Virtual" },
                ]).map((t) => (
                  <button
                    key={String(t.value)}
                    type="button"
                    onClick={() => setIsVirtual(t.value)}
                    disabled={submitting}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isVirtual === t.value ? "bg-zinc-900 text-white" : "bg-muted text-muted-foreground hover:bg-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {isVirtual ? (
              <div className="space-y-1.5">
                <Label htmlFor="virtual_url">
                  Link <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="virtual_url"
                  type="url"
                  placeholder="https://zoom.us/…"
                  value={virtualUrl}
                  onChange={(e) => setVirtualUrl(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="location">Location (optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} disabled={submitting} />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
