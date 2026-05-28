import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, CalendarDays, Monitor, ExternalLink, Receipt } from "lucide-react";
import { formatPrice } from "@/lib/format-price";

type Registration = {
  id: string;
  status: string;
  amount_paid: number | null;
  currency: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    event_date: string;
    is_virtual: boolean;
    virtual_url: string | null;
    image_url: string | null;
    location: string | null;
  } | null;
};

export default async function RegistrationsPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await db
    .from("event_registrations")
    .select(`
      id, status, amount_paid, currency, created_at,
      event:events (id, title, event_date, is_virtual, virtual_url, image_url, location)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const registrations: Registration[] = data ?? [];

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      completed: { label: "Confirmed",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      pending:   { label: "Processing", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      refunded:  { label: "Refunded",   cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
      cancelled: { label: "Cancelled",  cls: "bg-red-50 text-red-600 border-red-200" },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
        >
          <Receipt className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">My Registrations</h1>
          <p className="text-sm text-zinc-500">Paid class and event registrations</p>
        </div>
      </div>

      {registrations.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-16 text-center">
          <Receipt className="size-10 text-zinc-200 mx-auto mb-3" />
          <p className="font-medium text-zinc-400">No registrations yet</p>
          <p className="text-sm text-zinc-400 mt-1">
            Browse events to find paid classes to join.
          </p>
          <Link
            href="/events"
            className="inline-block mt-4 text-sm font-semibold text-[#E8503A] hover:underline"
          >
            Browse events →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => {
            const event = reg.event;
            const isPast = event ? new Date(event.event_date) < new Date() : false;
            const isConfirmed = reg.status === "completed";

            return (
              <div
                key={reg.id}
                className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden"
              >
                <div
                  className="h-1"
                  style={{
                    background: isConfirmed
                      ? "linear-gradient(90deg, #E8503A, #F07058)"
                      : "linear-gradient(90deg, #d1d5db, #e5e7eb)",
                  }}
                />
                <div className="p-5 flex items-start gap-4">
                  {/* Event thumbnail */}
                  {event?.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="size-16 rounded-xl object-cover flex-shrink-0 border border-zinc-100"
                    />
                  ) : (
                    <div
                      className="size-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
                    >
                      <CreditCard className="size-6 text-white" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Link
                        href={`/events/${event?.id}`}
                        className="font-bold text-sm text-zinc-900 hover:text-[#F07058] transition-colors truncate"
                      >
                        {event?.title ?? "Event removed"}
                      </Link>
                      {statusBadge(reg.status)}
                    </div>

                    {event && (
                      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <CalendarDays className="size-3" />
                        {format(new Date(event.event_date), "EEE, MMM d, yyyy · h:mm a")}
                        {isPast && (
                          <span className="text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full text-[10px] font-medium ml-1">
                            Past
                          </span>
                        )}
                      </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      {reg.amount_paid != null && (
                        <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                          <CreditCard className="size-3 text-[#E8503A]" />
                          {formatPrice(reg.amount_paid, reg.currency)} paid
                        </span>
                      )}
                      {event?.is_virtual && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <Monitor className="size-3" /> Virtual
                        </span>
                      )}
                    </div>

                    {/* Virtual link — only when confirmed */}
                    {isConfirmed && event?.is_virtual && event?.virtual_url && (
                      <a
                        href={event.virtual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors mt-1"
                      >
                        <ExternalLink className="size-3" />
                        Join Class
                      </a>
                    )}

                    {reg.status === "pending" && (
                      <p className="text-xs text-amber-600 mt-1">
                        Payment is being confirmed — refresh in a moment.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
