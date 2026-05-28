"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

interface LogoUploadProps {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onClear: () => void;
}

export default function LogoUpload({ currentUrl, onUpload, onClear }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("vendor-logos")
      .upload(path, file, { upsert: false });

    if (error) {
      alert(`Upload failed: ${error.message}`);
      setPreview(currentUrl);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("vendor-logos").getPublicUrl(path);
    onUpload(data.publicUrl);
    setUploading(false);
  }

  function handleClear() {
    setPreview(null);
    onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-zinc-700">Logo</span>
      {preview ? (
        <div className="relative size-16 rounded-xl border border-zinc-200 overflow-hidden bg-white flex items-center justify-center">
          <img src={preview} alt="Logo" className="w-full h-full object-contain p-1" />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="size-4 animate-spin text-zinc-400" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="size-16 rounded-xl border-2 border-dashed border-zinc-200 hover:border-[#F07058] hover:bg-[#F07058]/5 transition-all flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#F07058] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-[9px] font-semibold">Logo</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
