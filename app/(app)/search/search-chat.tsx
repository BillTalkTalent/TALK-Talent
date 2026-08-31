"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Send, Loader2 } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What events are coming up this month?",
  "Are there any recruiter jobs posted recently?",
  "What's being discussed in the forum about AI sourcing?",
];

// Renders relative app links (/events/..., /jobs/..., /forum/..., /members/...,
// /vendors/...) and any absolute URL as clickable links, everything else as
// plain text — split-and-map instead of dangerouslySetInnerHTML so there's
// no HTML injection surface even though this is model-generated text.
function renderWithLinks(text: string) {
  const re = /(\/(?:events|jobs|forum|members|vendors)\/[^\s)]+|https?:\/\/[^\s)]+)/g;
  return text.split(re).map((part, i) =>
    re.test(part) ? (
      <a key={i} href={part} className="underline decoration-dotted text-[#E8503A] hover:decoration-solid">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function SearchChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The dashboard's "Ask TALK" bar links here with ?q=<question> — send it
  // automatically on arrival instead of making the member retype it.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages([...next, { role: "assistant" as const, content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong — please try again." };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="size-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}>
          <Sparkles className="size-4.5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-zinc-900 leading-tight">Ask TALK</h1>
          <p className="text-xs text-zinc-400">Search events, jobs, forum discussions, members, and vendors</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 pb-28">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Try asking</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="block w-full text-left text-sm text-zinc-600 bg-white border border-zinc-100 rounded-xl px-4 py-3 hover:border-[#E8503A]/40 hover:bg-[#E8503A]/03 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-zinc-700 bg-white border border-zinc-100"
              }
              style={m.role === "user" ? { background: "#0F1F35" } : undefined}
            >
              {m.content ? (
                <span className="whitespace-pre-wrap leading-relaxed">{renderWithLinks(m.content)}</span>
              ) : (
                <Loader2 className="size-4 animate-spin text-zinc-300" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-4 flex gap-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about anything on TALK..."
          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center size-9 rounded-xl text-white shrink-0 disabled:opacity-40 transition-opacity"
          style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
