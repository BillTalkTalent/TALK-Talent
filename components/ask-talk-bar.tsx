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
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#E8503A]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask TALK anything — events, jobs, forum, members, vendors…"
        className="w-full rounded-xl bg-white border border-white/40 pl-11 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none shadow-sm focus:ring-2 focus:ring-[#E8503A]/30 transition-shadow"
      />
    </form>
  );
}
