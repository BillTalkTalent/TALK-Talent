"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Send, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatChannel, ChatMessage, Profile } from "@/lib/supabase/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type MessageWithProfile = ChatMessage & { profiles: Profile | null };

export default function ChatChannelPage() {
  const params = useParams<{ channelId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setCurrentUser(profile);
      }

      const [channelsResult, channelResult, messagesResult] = await Promise.all([
        supabase.from("chat_channels").select("*").order("created_at", { ascending: true }),
        supabase.from("chat_channels").select("*").eq("id", params.channelId).single(),
        supabase
          .from("chat_messages")
          .select("*, profiles(*)")
          .eq("channel_id", params.channelId)
          .order("created_at", { ascending: true })
          .limit(50),
      ]);

      setChannels(channelsResult.data ?? []);
      setCurrentChannel(channelResult.data);
      setMessages((messagesResult.data as MessageWithProfile[]) ?? []);
      setLoading(false);
    };

    init();
  }, [params.channelId, supabase]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${params.channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${params.channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Skip if we already have it (e.g. our own optimistic insert).
          let already = false;
          setMessages((prev) => {
            already = prev.some((m) => m.id === newMsg.id);
            return prev;
          });
          if (already) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newMsg.user_id ?? "")
            .single();
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id)
              ? prev
              : [...prev, { ...newMsg, profiles: profile ?? null }],
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.channelId, supabase]);

  // Reliable fallback: poll for new messages every few seconds and merge in
  // anything we don't already have. Realtime postgres_changes silently drops
  // events for the authed user when the socket authorizes as anon against the
  // approved-members RLS policy, so we don't depend on it alone. Dedup by id
  // keeps this harmless when realtime *does* deliver.
  useEffect(() => {
    const poll = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles(*)")
        .eq("channel_id", params.channelId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (!data) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = (data as MessageWithProfile[]).filter((m) => !ids.has(m.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    };
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [params.channelId, supabase]);

  const sendMessage = async () => {
    if (!draft.trim() || !currentUser) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");

    // Insert and append the saved row immediately, so the sender always sees
    // their message without waiting on (or depending on) realtime.
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: params.channelId,
        user_id: currentUser.id,
        content,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      // Put the text back so it isn't lost.
      setDraft(content);
    } else if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as MessageWithProfile],
      );
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Channel sidebar */}
      <aside className="w-56 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {channels.map((ch) => (
              <Link
                key={ch.id}
                href={`/chat/${ch.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  ch.id === params.channelId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Hash className="size-3.5 shrink-0" />
                <span className="truncate">{ch.name}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Hash className="size-4 text-muted-foreground" />
          <span className="font-medium">{currentChannel?.name ?? "..."}</span>
          {currentChannel?.description && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">{currentChannel.description}</span>
            </>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {messages.map((msg, i) => {
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const isGrouped =
                  prevMsg &&
                  prevMsg.user_id === msg.user_id &&
                  new Date(msg.created_at).getTime() -
                    new Date(prevMsg.created_at).getTime() <
                    5 * 60 * 1000;

                return (
                  <div key={msg.id} className={cn("flex items-start gap-3", isGrouped && "mt-0.5")}>
                    {!isGrouped ? (
                      <Avatar size="sm" className="mt-0.5">
                        {msg.profiles?.avatar_url && (
                          <AvatarImage
                            src={msg.profiles.avatar_url}
                            alt={msg.profiles.full_name ?? ""}
                          />
                        )}
                        <AvatarFallback>
                          {getInitials(msg.profiles?.full_name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="size-6 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {!isGrouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-medium">
                            {msg.profiles?.full_name ?? "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder={`Message #${currentChannel?.name ?? "channel"}…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[2.25rem] max-h-32 resize-none"
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={sending || !draft.trim()}
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
