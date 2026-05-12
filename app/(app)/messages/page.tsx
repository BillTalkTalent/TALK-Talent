"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from "date-fns";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DmConversation, DmMessage, Profile } from "@/lib/supabase/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type ConversationWithOther = DmConversation & { otherUser: Profile | null; lastMessage: string | null; lastAt: string | null; unreadCount: number };
type MessageWithSender = DmMessage & { profiles: Profile | null };

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationWithOther[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
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

  const loadConversations = useCallback(
    async (userId: string) => {
      const { data: convs } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!convs) return [];

      const convIds = convs.map((c) => c.id);

      // Batch fetch: last messages and unread counts for all conversations
      const [allLastMsgs, unreadMsgs] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("conversation_id, content, created_at, sender_id, is_read")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("dm_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", userId)
          .eq("is_read", false),
      ]);

      // Build maps
      const lastMsgMap: Record<string, { content: string; created_at: string }> = {};
      for (const msg of allLastMsgs.data ?? []) {
        if (!lastMsgMap[msg.conversation_id]) {
          lastMsgMap[msg.conversation_id] = { content: msg.content, created_at: msg.created_at };
        }
      }

      const unreadCountMap: Record<string, number> = {};
      for (const msg of unreadMsgs.data ?? []) {
        unreadCountMap[msg.conversation_id] = (unreadCountMap[msg.conversation_id] ?? 0) + 1;
      }

      // Batch fetch other user profiles
      const otherIds = convs.map((conv) =>
        conv.participant_a === userId ? conv.participant_b : conv.participant_a
      );
      const { data: otherProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds);

      const profileMap: Record<string, Profile> = {};
      for (const p of otherProfiles ?? []) {
        profileMap[p.id] = p;
      }

      return convs.map((conv) => {
        const otherId = conv.participant_a === userId ? conv.participant_b : conv.participant_a;
        return {
          ...conv,
          otherUser: profileMap[otherId] ?? null,
          lastMessage: lastMsgMap[conv.id]?.content ?? null,
          lastAt: lastMsgMap[conv.id]?.created_at ?? null,
          unreadCount: unreadCountMap[conv.id] ?? 0,
        };
      });
    },
    [supabase]
  );

  const openConversation = useCallback(
    async (convId: string, other: Profile | null) => {
      setActiveConvId(convId);
      setOtherUser(other);

      const { data } = await supabase
        .from("dm_messages")
        .select("*, profiles(*)")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages((data as MessageWithSender[]) ?? []);

      // Mark all unread messages in this conversation as read
      if (currentUser) {
        await supabase
          .from("dm_messages")
          .update({ is_read: true })
          .eq("conversation_id", convId)
          .neq("sender_id", currentUser.id)
          .eq("is_read", false);

        // Clear unread count badge in sidebar immediately (optimistic)
        setConversations((prev) =>
          prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c)
        );
      }
    },
    [supabase, currentUser]
  );

  const getOrCreateConversation = useCallback(
    async (myId: string, otherId: string): Promise<string | null> => {
      const { data: existing } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(
          `and(participant_a.eq.${myId},participant_b.eq.${otherId}),and(participant_a.eq.${otherId},participant_b.eq.${myId})`
        )
        .single();

      if (existing) return existing.id;

      const { data: created } = await supabase
        .from("dm_conversations")
        .insert({ participant_a: myId, participant_b: otherId })
        .select()
        .single();

      return created?.id ?? null;
    },
    [supabase]
  );

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      const convs = await loadConversations(user.id);
      setConversations(convs);

      if (withUserId) {
        // Open or create DM with this user
        const convId = await getOrCreateConversation(user.id, withUserId);
        if (convId) {
          const { data: otherProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", withUserId)
            .single();
          await openConversation(convId, otherProfile ?? null);
          // Refresh convs to include new one
          const refreshed = await loadConversations(user.id);
          setConversations(refreshed);
        }
      } else if (convs.length > 0) {
        await openConversation(convs[0].id, convs[0].otherUser);
      }

      setLoading(false);
    };

    init();
  }, [withUserId, supabase, loadConversations, openConversation, getOrCreateConversation]);

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConvId) return;

    const channel = supabase
      .channel(`dm:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DmMessage;
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newMsg.sender_id ?? "")
            .single();
          setMessages((prev) => [...prev, { ...newMsg, profiles: sender ?? null }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, supabase]);

  const sendMessage = async () => {
    if (!draft.trim() || !currentUser || !activeConvId) return;
    setSending(true);

    await supabase.from("dm_messages").insert({
      conversation_id: activeConvId,
      sender_id: currentUser.id,
      content: draft.trim(),
      is_read: false,
    });

    setDraft("");
    setSending(false);

    // Refresh conversation list
    const refreshed = await loadConversations(currentUser.id);
    setConversations(refreshed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Conversation list */}
      <aside className="w-64 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold">Direct Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            <nav className="p-2 space-y-0.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id, conv.otherUser)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    conv.id === activeConvId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar size="sm">
                    {conv.otherUser?.avatar_url && (
                      <AvatarImage
                        src={conv.otherUser.avatar_url}
                        alt={conv.otherUser.full_name ?? ""}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(conv.otherUser?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm truncate", conv.unreadCount > 0 && conv.id !== activeConvId ? "font-bold" : "font-medium")}>
                      {conv.otherUser?.full_name ?? "Unknown"}
                    </p>
                    {conv.lastMessage && (
                      <p className={cn("text-xs truncate", conv.unreadCount > 0 && conv.id !== activeConvId ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {conv.lastAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastAt), { addSuffix: false })}
                      </span>
                    )}
                    {conv.unreadCount > 0 && conv.id !== activeConvId && (
                      <span className="min-w-[18px] h-4.5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-black">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          )}
        </ScrollArea>
      </aside>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!activeConvId ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-5" />
            <span>Select a conversation</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center gap-3">
              <Avatar size="sm">
                {otherUser?.avatar_url && (
                  <AvatarImage src={otherUser.avatar_url} alt={otherUser.full_name ?? ""} />
                )}
                <AvatarFallback>{getInitials(otherUser?.full_name ?? null)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{otherUser?.full_name ?? "Unknown"}</p>
                {otherUser?.title && (
                  <p className="text-xs text-muted-foreground">{otherUser.title}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const isGrouped =
                      prevMsg &&
                      prevMsg.sender_id === msg.sender_id &&
                      new Date(msg.created_at).getTime() -
                        new Date(prevMsg.created_at).getTime() <
                        5 * 60 * 1000;

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                      >
                        {!isGrouped ? (
                          <Avatar size="sm" className="shrink-0">
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
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder={`Message ${otherUser?.full_name ?? "…"}`}
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
          </>
        )}
      </div>
    </div>
  );
}
