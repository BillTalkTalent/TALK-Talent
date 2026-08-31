"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Compact entry point into /search (the full "Ask TALK" chat) — lives at the
// top of the dashboard so members don't have to find it under the nav's
// "More" menu first. Submitting hands off to the chat page itself via
// ?q=<question> rather than duplicating the chat/streaming logic here.
export default function AskTalkBar() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/40" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask TALK anything — events, jobs, forum, members, vendors…"
        className="w-full rounded-xl bg-white/10 border border-white/15 pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/15 transition-colors"
      />
    </form>
  );
}
