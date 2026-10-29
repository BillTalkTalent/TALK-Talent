"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DownloadButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    // Bucket is private (founder-files, migration 111) — every download goes
    // through a freshly signed, short-lived URL rather than a stable public
    // one, so a leaked link stops working on its own.
    const { data, error } = await supabase.storage.from("founder-files").createSignedUrl(path, 60);
    setLoading(false);
    if (error || !data?.signedUrl) {
      alert("Couldn't generate a download link. Please try again.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : null}
      Download →
    </button>
  );
}
