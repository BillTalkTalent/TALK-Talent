"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X, Loader2, DollarSign } from "lucide-react";
import { TIME_ZONES, zonedWallTimeToUTC, localZone } from "@/lib/timezone";

// Default the picker to the organizer's own browser zone when it's one we list,
// otherwise Eastern.
const DEFAULT_TZ = (() => {
  const z = localZone();
  return TIME_ZONES.some((t) => t.value === z) ? z : "America/New_York";
})();

export default function CreateEventForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const supabase = createClient();

      let imageUrl: string | null = null;

      // Upload image if selected
      if (imageFile) {
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(path, imageFile, { upsert: false });

        if (uploadError) {
          setError(`Image upload failed: ${uploadError.message}`);
          setUploadingImage(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
        setUploadingImage(false);
      }

      const eventDate = fd.get("event_date") as string;
      const endDate = fd.get("end_date") as string;
      const timezone = (fd.get("timezone") as string) || DEFAULT_TZ;
      const maxAttendees = fd.get("max_attendees") as string;

      // The datetime-local inputs are naive wall-clock times. Interpret them in
      // the selected event timezone and store the correct UTC instant.
      const eventDateUtc = zonedWallTimeToUTC(eventDate, timezone).toISOString();
      const endDateUtc = endDate ? zonedWallTimeToUTC(endDate, timezone).toISOString() : null;
      const priceStr = fd.get("price") as string;
      const paidFlag = (fd.get("is_paid") as string) === "on";

      // Convert dollars → cents
      const priceCents = paidFlag && priceStr
        ? Math.round(parseFloat(priceStr) * 100)
        : null;

      const eventType = (fd.get("event_type") as string) || "in_person";
      const isVirtual = eventType !== "in_person"; // virtual + hybrid have a link

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from("events").insert({
        title: fd.get("title") as string,
        description: (fd.get("description") as string) || null,
        location: (fd.get("location") as string) || null,
        event_type: eventType,
        is_virtual: isVirtual,
        virtual_url: (fd.get("virtual_url") as string) || null,
        event_date: eventDateUtc,
        end_date: endDateUtc,
        timezone,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        status:
          ((fd.get("status") as string) as "draft" | "published" | "cancelled") ||
          "draft",
        image_url: imageUrl,
        is_paid: paidFlag,
        price: priceCents,
        currency: (fd.get("currency") as string) || "usd",
        organizer_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      form.reset();
      clearImage();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Title */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required />
      </div>

      {/* Description */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          placeholder="Describe the event…"
        />
      </div>

      {/* Event Image */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Event Image</Label>
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-zinc-200 aspect-[16/6] bg-zinc-100">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-zinc-200 hover:border-[#f97316] hover:bg-[#f97316]/5 transition-all py-8 flex flex-col items-center gap-2 text-zinc-400 hover:text-[#f97316]"
          >
            <Upload className="size-6" />
            <span className="text-sm font-medium">Click to upload event image</span>
            <span className="text-xs">PNG, JPG, WEBP up to 5MB · Recommended: 960×400px</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* Location / Virtual URL */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="City, Venue" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="virtual_url">Virtual URL</Label>
        <Input id="virtual_url" name="virtual_url" type="url" placeholder="https://zoom.us/…" />
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Label htmlFor="event_date">Start Date &amp; Time *</Label>
        <Input id="event_date" name="event_date" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_date">End Date &amp; Time</Label>
        <Input id="end_date" name="end_date" type="datetime-local" />
      </div>

      {/* Timezone — the zone the start/end times are entered in */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="timezone">Time Zone *</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={DEFAULT_TZ}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TIME_ZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">
          Enter the start and end times in this zone. Members see the event in this
          zone plus their own local time.
        </p>
      </div>

      {/* Max attendees / Status */}
      <div className="space-y-2">
        <Label htmlFor="max_attendees">Max Attendees</Label>
        <Input id="max_attendees" name="max_attendees" type="number" min="1" placeholder="Unlimited" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue="draft"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Format — in person / virtual / hybrid */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="event_type">Format *</Label>
        <select
          id="event_type"
          name="event_type"
          defaultValue="in_person"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="in_person">📍 In person</option>
          <option value="webinar">🎥 Virtual</option>
          <option value="hybrid">🔀 Hybrid</option>
        </select>
        <p className="text-xs text-zinc-400">
          Virtual and hybrid events show the virtual link; in-person and hybrid show the location.
        </p>
      </div>

      {/* Paid event toggle */}
      <div className="sm:col-span-2 rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_paid"
            name="is_paid"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
            className="size-4 rounded border-zinc-300"
          />
          <Label htmlFor="is_paid" className="cursor-pointer font-semibold">
            <DollarSign className="size-3.5 inline mr-0.5 text-emerald-600" />
            Paid event
          </Label>
        </div>

        {isPaid && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs">Price (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0.50"
                  step="0.01"
                  placeholder="49.00"
                  required={isPaid}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <select
                id="currency"
                name="currency"
                defaultValue="usd"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="usd">USD — US Dollar</option>
                <option value="cad">CAD — Canadian Dollar</option>
                <option value="gbp">GBP — British Pound</option>
                <option value="eur">EUR — Euro</option>
                <option value="aud">AUD — Australian Dollar</option>
              </select>
            </div>
            <p className="col-span-2 text-xs text-zinc-400">
              Members will be taken to Stripe Checkout to pay. The virtual link is hidden until payment is confirmed.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending || uploadingImage}>
          {uploadingImage ? (
            <><Loader2 className="size-4 animate-spin mr-2" /> Uploading image…</>
          ) : isPending ? (
            <><Loader2 className="size-4 animate-spin mr-2" /> Creating…</>
          ) : (
            <><ImageIcon className="size-4 mr-2" /> Create Event</>
          )}
        </Button>
      </div>
    </form>
  );
}
