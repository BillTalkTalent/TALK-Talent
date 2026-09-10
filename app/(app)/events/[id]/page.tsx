import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import EventDetailClient from "./event-detail-client";

// A shared event link is only as good as its preview — pasted into
// LinkedIn, Slack, or a text message, it needs the event's own image/title/
// description, not the site-wide "TALK" default. Requires a server
// component (the page itself was a client component with no way to export
// metadata), so this thin wrapper fetches just enough to build the card and
// renders the existing client page for everything else.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("title, description, image_url, visibility")
    .eq("id", id)
    .single();

  if (!event || event.visibility === "leads_only") {
    return { title: "TALK Event" };
  }

  const title = event.title as string;
  const description = event.description
    ? String(event.description).slice(0, 200)
    : "Join this TALK event — the community for TA leaders.";
  const images = event.image_url ? [{ url: event.image_url as string }] : undefined;

  return {
    title: `${title} | TALK`,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: event.image_url ? [event.image_url as string] : undefined },
  };
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}
