"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";

export default function CreateEventForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
      const maxAttendees = fd.get("max_attendees") as string;

      const { error: insertError } = await supabase.from("events").insert({
        title: fd.get("title") as string,
        description: (fd.get("description") as string) || null,
        location: (fd.get("location") as string) || null,
        is_virtual: (fd.get("is_virtual") as string) === "on",
        virtual_url: (fd.get("virtual_url") as string) || null,
        event_date: eventDate,
        end_date: endDate || null,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        status:
          ((fd.get("status") as string) as "draft" | "published" | "cancelled") ||
          "draft",
        image_url: imageUrl,
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

      {/* Virtual checkbox */}
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" id="is_virtual" name="is_virtual" className="size-4 rounded border-zinc-300" />
        <Label htmlFor="is_virtual" className="cursor-pointer">Virtual event</Label>
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
