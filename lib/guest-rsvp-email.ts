export type GuestRsvpEvent = {
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  is_virtual: boolean;
  virtual_url: string | null;
  venue_name: string | null;
  location: string | null;
  timezone?: string | null;
};

export function icsFor(event: GuestRsvpEvent): string {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location = event.is_virtual ? (event.virtual_url ?? "Online") : [event.venue_name, event.location].filter(Boolean).join(", ");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:${event.title}\r\nDTSTART:${fmt(event.event_date)}\r\nDTEND:${fmt(event.end_date ?? event.event_date)}\r\nDESCRIPTION:${(event.description ?? "").slice(0, 400).replace(/\r?\n/g, "\\n")}\r\nLOCATION:${location}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
}

// Sent the moment someone submits a guest RSVP — a holding acknowledgment,
// not a confirmation. Deliberately withholds the venue/virtual-link details
// and the calendar invite, since neither is real until an admin approves.
export function buildGuestPendingEmail(opts: { firstName: string; eventTitle: string; eventId: string; origin: string }): string {
  const { firstName, eventTitle, eventId, origin } = opts;
  return `
    <p>Hi ${firstName},</p>
    <p>We got your RSVP for <strong>${eventTitle}</strong> — thanks for signing up!</p>
    <p>Someone from TALK will review it shortly. You'll get a second email with the full details (and a calendar invite) once you're confirmed.</p>
    <p><a href="${origin}/events/${eventId}">View event details</a></p>
  `;
}

// Sent once an admin approves a pending guest RSVP — the actual
// confirmation, now carrying the calendar invite and a cancel link. Same
// content the old no-review flow sent immediately at submit time.
export function buildGuestConfirmedEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventId: string;
  when: string;
  origin: string;
  cancelUrl: string;
}): string {
  const { firstName, eventTitle, eventId, when, origin, cancelUrl } = opts;
  return `
    <p>Hi ${firstName},</p>
    <p>You're confirmed for <strong>${eventTitle}</strong> — ${when}.</p>
    <p><a href="${origin}/events/${eventId}">View event details</a></p>
    <p>A calendar invite is attached.</p>
    <p style="color:#667;font-size:13px;">Can't make it anymore? <a href="${cancelUrl}">Cancel your RSVP</a>.</p>
  `;
}
