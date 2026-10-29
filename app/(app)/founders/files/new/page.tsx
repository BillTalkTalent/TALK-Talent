"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";

export default function NewFounderFilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"file" | "recording">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && (kind === "recording" ? link.trim() : selectedFile);

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

    let url = link.trim();

    if (kind === "file" && selectedFile) {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("founder-files").upload(path, selectedFile);
      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
      url = path;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("founder_files").insert({
      uploaded_by: user.id,
      kind,
      title: title.trim(),
      description: description.trim() || null,
      url,
    });

    if (error) {
      toast.error("Failed to save. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success(kind === "file" ? "File added!" : "Recording added!");
    router.push("/founders/files");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/founders/files" className="hover:underline">Files &amp; Recordings</Link>
        <span>/</span>
        <span>Add</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a file or recording</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {([
                  { value: "file" as const, label: "File" },
                  { value: "recording" as const, label: "Recording link" },
                ]).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setKind(t.value)}
                    disabled={submitting}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      kind === t.value ? "bg-zinc-900 text-white" : "bg-muted text-muted-foreground hover:bg-zinc-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={submitting} />
            </div>

            {kind === "recording" ? (
              <div className="space-y-1.5">
                <Label htmlFor="link">
                  Link <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://youtube.com/…, https://loom.com/…, https://drive.google.com/…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>
                  File <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="w-full rounded-xl border-2 border-dashed border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground hover:text-indigo-600 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {selectedFile ? selectedFile.name : "Choose a file"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
