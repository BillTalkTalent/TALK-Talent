"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, FileText } from "lucide-react";

type Material = { id: string; title: string; file_url: string };

export default function MaterialsManager({
  eventId,
  initialMaterials,
}: {
  eventId: string;
  initialMaterials: Material[];
}) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [title, setTitle] = useState("");
  const [hasFile, setHasFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const file = fileInputRef.current?.files?.[0];
    // The button used to only require a title, not a file — clicking "Add"
    // with a title typed but no file picked just silently did nothing, no
    // error, no spinner. Surface it instead of failing quietly.
    if (!title.trim()) {
      toast.error("Give the material a title first.");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("event-materials").upload(path, file, { upsert: false });
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("event-materials").getPublicUrl(path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("event_materials")
      .insert({ event_id: eventId, title: title.trim(), file_url: urlData.publicUrl })
      .select()
      .single();

    if (error || !data) {
      toast.error(`Couldn't save: ${error?.message ?? "please try again"}`);
      setUploading(false);
      return;
    }

    setMaterials((prev) => [...prev, data]);
    setTitle("");
    setHasFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("event_materials").delete().eq("id", id);
    if (!error) setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-3">
      {materials.length > 0 && (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2">
              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-700 hover:text-[#1E4B82] min-w-0">
                <FileText className="size-4 shrink-0 text-zinc-400" />
                <span className="truncate">{m.title}</span>
              </a>
              <button type="button" onClick={() => handleDelete(m.id)} className="text-zinc-400 hover:text-red-600 shrink-0">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[160px] space-y-1">
          <label className="text-xs text-zinc-500">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Slide deck, worksheet, etc." />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">File</label>
          <input
            ref={fileInputRef}
            type="file"
            className="block text-xs"
            onChange={(e) => setHasFile(!!e.target.files?.length)}
          />
        </div>
        <Button type="button" onClick={handleAdd} disabled={uploading || !title.trim() || !hasFile} size="sm">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}
