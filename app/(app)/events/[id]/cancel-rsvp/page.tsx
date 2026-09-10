"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type EventTeaser = { title: string; image_url: string | null };

// Reached from the "Cancel your RSVP" link in a guest-RSVP confirmation
// email. Deliberately a confirm-then-act page (not a bare link that cancels
// on load) so email link-prefetching by a mail client/scanner can't
// accidentally cancel someone's RSVP just by opening the message.
export default function CancelGuestRsvpPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rsvpId = searchParams.get("rsvp");

  const [event, setEvent] = useState<EventTeaser | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<"cancelled" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${params.id}/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEvent(data))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleCancel() {
    if (!rsvpId) return;
    setCancelling(true);
    setErrorMsg(null);
    const res = await fetch(`/api/events/${params.id}/guest-rsvp/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpId }),
    });
    const data = await res.json();
    setCancelling(false);
    if (!res.ok) {
      setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
      setResult("error");
      return;
    }
    setResult("cancelled");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F5F8FC" }}>
      <div className="max-w-sm w-full text-center">
        <Link href="/" className="inline-flex items-baseline mb-6" style={{ fontFamily: "var(--font-poppins), system-ui", fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}>
          <span style={{ color: "#E8503A" }}>TA</span><span style={{ color: "#0F1F35" }}>LK</span>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(15,31,53,0.08)]">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !rsvpId ? (
            <>
              <XCircle className="size-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: "#0F1F35" }}>This cancellation link is missing some details.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the link from your confirmation email, or contact the host.</p>
            </>
          ) : result === "cancelled" ? (
            <>
              <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: "#0F1F35" }}>You&apos;re no longer registered{event ? ` for ${event.title}` : ""}.</p>
              <p className="text-xs text-muted-foreground mt-1">Changed your mind? You can RSVP again anytime from the event page.</p>
              <Link href={`/events/${params.id}`} className="inline-block mt-4 text-xs font-bold" style={{ color: "#E8503A" }}>View event details</Link>
            </>
          ) : result === "error" ? (
            <>
              <XCircle className="size-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: "#0F1F35" }}>{errorMsg}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold" style={{ color: "#0F1F35" }}>Cancel your RSVP{event ? ` for ${event.title}` : ""}?</p>
              <p className="text-xs text-muted-foreground mt-1">The host will be notified you can no longer attend.</p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center justify-center gap-2 w-full mt-4 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-60"
                style={{ background: "#E8503A" }}
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Yes, cancel my RSVP
              </button>
              <Link href={`/events/${params.id}`} className="inline-block mt-3 text-xs text-muted-foreground hover:underline">Never mind, keep my RSVP</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
