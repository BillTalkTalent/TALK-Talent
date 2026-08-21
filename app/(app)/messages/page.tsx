"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, UserPlus, X, Users } from "lucide-react";
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

// participant_a/participant_b are legacy columns (see migration 061) — group
// membership now lives in conversation_participants, so every conversation
// carries a `participants` list instead of a single `otherUser`.
type ConversationWithParticipants = DmConversation & {
  participants: Profile[];
  lastMessage: string | null;
  lastAt: string | null;
  unreadCount: number;
};
type MessageWithSender = DmMessage & { profiles: Profile | null };

function conversationTitle(participants: Profile[], viewerId: string | undefined): string {
  const others = participants.filter((p) => p.id !== viewerId);
  if (others.length === 0) return "Unknown";
  return others.map((p) => p.full_name ?? "Unknown").join(", ");
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with") ?? searchParams.get("new");
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<Profile[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // "New message" — search members by name, select one or more, then start
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgQuery, setNewMsgQuery] = useState("");
  const [newMsgResults, setNewMsgResults] = useState<Profile[]>([]);
  const [newMsgSelected, setNewMsgSelected] = useState<Profile[]>([]);
  const [newMsgSearching, setNewMsgSearching] = useState(false);
  const [newMsgStarting, setNewMsgStarting] = useState(false);
  const newMsgRef = useRef<HTMLDivElement>(null);

  // "Add person" — same search pattern, scoped to the open conversation
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [addPersonQuery, setAddPersonQuery] = useState("");
  const [addPersonResults, setAddPersonResults] = useState<Profile[]>([]);
  const [addPersonSearching, setAddPersonSearching] = useState(false);
  const addPersonRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-grow the composer with its content, up to a max height, then let it
  // scroll internally — instead of staying pinned at a single-line height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const loadConversations = useCallback(
    async (userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: myRows } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convIds = ((myRows ?? []) as any[]).map((r) => r.conversation_id);
      if (convIds.length === 0) return [];

      const { data: convs } = await supabase
        .from("dm_conversations")
        .select("*")
        .in("id", convIds)
        .order("created_at", { ascending: false });

      if (!convs) return [];

      // Batch fetch: last messages, unread counts, and every conversation's
      // full participant list (self included; filtered out for display).
      const [allLastMsgs, unreadMsgs, allParticipants] = await Promise.all([
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", convIds),
      ]);

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

      const participantRows = (allParticipants.data ?? []) as { conversation_id: string; user_id: string }[];
      const allUserIds = Array.from(new Set(participantRows.map((r) => r.user_id)));
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", allUserIds);
      const profileMap: Record<string, Profile> = {};
      for (const p of profiles ?? []) profileMap[p.id] = p;

      const participantsByConv: Record<string, Profile[]> = {};
      for (const row of participantRows) {
        const p = profileMap[row.user_id];
        if (!p) continue;
        (participantsByConv[row.conversation_id] ??= []).push(p);
      }

      return convs.map((conv) => ({
        ...conv,
        participants: participantsByConv[conv.id] ?? [],
        lastMessage: lastMsgMap[conv.id]?.content ?? null,
        lastAt: lastMsgMap[conv.id]?.created_at ?? null,
        unreadCount: unreadCountMap[conv.id] ?? 0,
      }));
    },
    [supabase]
  );

  const openConversation = useCallback(
    async (convId: string, participants: Profile[], viewerId: string) => {
      setActiveConvId(convId);
      setActiveParticipants(participants);

      const { data } = await supabase
        .from("dm_messages")
        .select("*, profiles(*)")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages((data as MessageWithSender[]) ?? []);

      // Mark all unread messages in this conversation as read. viewerId is
      // passed in explicitly (not read from currentUser state/ref) so this
      // always fires correctly — including for the very first conversation
      // auto-opened on page load, before currentUser state has settled from
      // its initial null.
      const { error: markReadError } = await supabase
        .from("dm_messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .neq("sender_id", viewerId)
        .eq("is_read", false);
      if (markReadError) console.error("Failed to mark DM messages as read:", markReadError.message);

      // Clear unread count badge in sidebar immediately (optimistic)
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c)
      );
    },
    [supabase]
  );

  // Exact-match dedup for 1:1 conversations only — a group that happens to
  // include both of these two users is not the same thing as a private DM
  // between them, so this only returns a conversation whose participant set
  // is exactly {myId, otherId}.
  const findExactConversation = useCallback(
    async (myId: string, otherId: string): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mine } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", myId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myConvIds = ((mine ?? []) as any[]).map((r) => r.conversation_id);
      if (myConvIds.length === 0) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: theirs } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherId)
        .in("conversation_id", myConvIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shared = ((theirs ?? []) as any[]).map((r) => r.conversation_id);
      if (shared.length === 0) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allRows } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .in("conversation_id", shared);
      const counts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (allRows ?? []) as any[]) counts[r.conversation_id] = (counts[r.conversation_id] ?? 0) + 1;
      const exact = shared.find((id) => counts[id] === 2);
      return exact ?? null;
    },
    [supabase]
  );

  const getOrCreateConversation = useCallback(
    async (myId: string, otherId: string): Promise<string | null> => {
      const existingId = await findExactConversation(myId, otherId);
      if (existingId) return existingId;

      const { data: created, error } = await supabase
        .from("dm_conversations")
        .insert({ created_by: myId })
        .select()
        .single();
      if (error || !created) {
        console.error("Failed to create DM conversation:", error?.message);
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: partErr } = await (supabase as any)
        .from("conversation_participants")
        .insert([
          { conversation_id: created.id, user_id: myId },
          { conversation_id: created.id, user_id: otherId },
        ]);
      if (partErr) console.error("Failed to add DM participants:", partErr.message);

      return created.id;
    },
    [supabase, findExactConversation]
  );

  const createGroupConversation = useCallback(
    async (myId: string, otherIds: string[]): Promise<string | null> => {
      const { data: created, error } = await supabase
        .from("dm_conversations")
        .insert({ created_by: myId })
        .select()
        .single();
      if (error || !created) {
        console.error("Failed to create group conversation:", error?.message);
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: partErr } = await (supabase as any)
        .from("conversation_participants")
        .insert([myId, ...otherIds].map((uid) => ({ conversation_id: created.id, user_id: uid })));
      if (partErr) console.error("Failed to add group participants:", partErr.message);

      return created.id;
    },
    [supabase]
  );

  const addParticipant = useCallback(
    async (convId: string, userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("conversation_participants")
        .insert({ conversation_id: convId, user_id: userId });
      if (error) {
        console.error("Failed to add participant:", error.message);
        return false;
      }
      return true;
    },
    [supabase]
  );

  // Debounced member search shared by "New message" and "Add person" —
  // approved members only, matching the same visibility RLS already grants
  // for browsing.
  function useMemberSearch(
    open: boolean,
    query: string,
    excludeIds: string[],
    setResults: (p: Profile[]) => void,
    setSearching: (b: boolean) => void
  ) {
    useEffect(() => {
      if (!open) return;
      const q = query.trim();
      if (q.length < 2) {
        Promise.resolve().then(() => {
          setResults([]);
          setSearching(false);
        });
        return;
      }
      Promise.resolve().then(() => setSearching(true));
      const timeout = setTimeout(async () => {
        let sq = supabase
          .from("profiles")
          .select("*")
          .eq("status", "approved")
          .eq("is_bot", false)
          .ilike("full_name", `%${q}%`)
          .limit(8);
        if (excludeIds.length > 0) sq = sq.not("id", "in", `(${excludeIds.join(",")})`);
        const { data } = await sq;
        setResults((data as Profile[]) ?? []);
        setSearching(false);
      }, 300);
      return () => clearTimeout(timeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, query, excludeIds.join(",")]);
  }

  useMemberSearch(
    newMsgOpen,
    newMsgQuery,
    [currentUser?.id, ...newMsgSelected.map((p) => p.id)].filter(Boolean) as string[],
    setNewMsgResults,
    setNewMsgSearching
  );

  useMemberSearch(
    addPersonOpen,
    addPersonQuery,
    activeParticipants.map((p) => p.id),
    setAddPersonResults,
    setAddPersonSearching
  );

  // Close the "New message" / "Add person" panels on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (newMsgRef.current && !newMsgRef.current.contains(e.target as Node)) {
        setNewMsgOpen(false);
      }
      if (addPersonRef.current && !addPersonRef.current.contains(e.target as Node)) {
        setAddPersonOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggleNewMsgSelected(p: Profile) {
    setNewMsgSelected((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    );
    setNewMsgQuery("");
    setNewMsgResults([]);
  }

  async function startSelectedConversation() {
    if (!currentUser || newMsgSelected.length === 0) return;
    setNewMsgStarting(true);
    const convId =
      newMsgSelected.length === 1
        ? await getOrCreateConversation(currentUser.id, newMsgSelected[0].id)
        : await createGroupConversation(currentUser.id, newMsgSelected.map((p) => p.id));

    if (convId) {
      const refreshed = await loadConversations(currentUser.id);
      setConversations(refreshed);
      const conv = refreshed.find((c) => c.id === convId);
      await openConversation(convId, conv?.participants ?? [currentUser, ...newMsgSelected], currentUser.id);
    }
    setNewMsgStarting(false);
    setNewMsgOpen(false);
    setNewMsgQuery("");
    setNewMsgResults([]);
    setNewMsgSelected([]);
  }

  async function handleAddPerson(p: Profile) {
    if (!activeConvId || !currentUser) return;
    const ok = await addParticipant(activeConvId, p.id);
    if (ok) {
      const refreshed = await loadConversations(currentUser.id);
      setConversations(refreshed);
      const conv = refreshed.find((c) => c.id === activeConvId);
      if (conv) setActiveParticipants(conv.participants);
    }
    setAddPersonOpen(false);
    setAddPersonQuery("");
    setAddPersonResults([]);
  }

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
          const refreshed = await loadConversations(user.id);
          setConversations(refreshed);
          const conv = refreshed.find((c) => c.id === convId);
          await openConversation(convId, conv?.participants ?? [], user.id);
        }
      } else if (convs.length > 0) {
        await openConversation(convs[0].id, convs[0].participants, user.id);
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
          // Own messages are already appended optimistically in sendMessage
          // below — skip re-adding once the realtime event for them arrives,
          // or they'd show twice.
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, { ...newMsg, profiles: sender ?? null }]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, supabase]);

  const sendMessage = async () => {
    if (!draft.trim() || !currentUser || !activeConvId || sending) return;
    setSending(true);
    const content = draft.trim();

    const { data: inserted } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: activeConvId,
        sender_id: currentUser.id,
        content,
        is_read: false,
      })
      .select("*, profiles(*)")
      .single();

    // Show it immediately rather than waiting on the realtime round-trip —
    // this is what actually guarantees the sender sees their own message
    // without a manual refresh, independent of realtime being connected.
    // The subscription above skips re-adding it once that event arrives.
    if (inserted) {
      const msg = inserted as MessageWithSender;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }

    setDraft("");
    setSending(false);

    // Fire-and-forget: email + in-app notification for the recipient(s)
    fetch("/api/dm/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConvId, messageContent: content }),
    }).catch(() => {});

    // Refresh conversation list
    const refreshed = await loadConversations(currentUser.id);
    setConversations(refreshed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Skip while an IME composition is in progress — the Enter that
    // confirms a composed word/character also bubbles up as a keydown, and
    // without this guard it sends the message mid-composition instead of
    // just confirming the text.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading messages...</p>
      </div>
    );
  }

  const activeOthers = activeParticipants.filter((p) => p.id !== currentUser?.id);
  const isGroupActive = activeParticipants.length > 2;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Conversation list */}
      <aside className="w-64 shrink-0 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between relative" ref={newMsgRef}>
          <h2 className="text-sm font-semibold">Direct Messages</h2>
          <button
            type="button"
            onClick={() => setNewMsgOpen((v) => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="New message"
          >
            <UserPlus className="size-4" />
          </button>

          {newMsgOpen && (
            <div className="absolute top-full left-2 right-2 mt-1 rounded-xl border bg-background shadow-lg z-20 p-2">
              {newMsgSelected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {newMsgSelected.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5"
                    >
                      {p.full_name?.split(" ")[0] ?? "Unknown"}
                      <button type="button" onClick={() => toggleNewMsgSelected(p)}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                autoFocus
                placeholder="Search members by name…"
                value={newMsgQuery}
                onChange={(e) => setNewMsgQuery(e.target.value)}
                className="mb-1.5"
              />
              {newMsgQuery.trim().length < 2 ? (
                <p className="text-xs text-muted-foreground px-2 py-1.5">Type at least 2 characters…</p>
              ) : newMsgSearching ? (
                <p className="text-xs text-muted-foreground px-2 py-1.5">Searching…</p>
              ) : newMsgResults.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1.5">No members found.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {newMsgResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleNewMsgSelected(p)}
                      className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors"
                    >
                      <Avatar size="sm">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />}
                        <AvatarFallback>{getInitials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name ?? "Unknown"}</p>
                        {(p.title || p.company) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[p.title, p.company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {newMsgSelected.length > 0 && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={startSelectedConversation}
                  disabled={newMsgStarting}
                >
                  {newMsgStarting
                    ? "Starting…"
                    : newMsgSelected.length === 1
                      ? "Start conversation"
                      : `Start group (${newMsgSelected.length + 1} people)`}
                </Button>
              )}
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            <nav className="p-2 space-y-0.5">
              {conversations.map((conv) => {
                const others = conv.participants.filter((p) => p.id !== currentUser?.id);
                const isGroup = conv.participants.length > 2;
                const title = conversationTitle(conv.participants, currentUser?.id);
                return (
                  <button
                    key={conv.id}
                    onClick={() => currentUser && openConversation(conv.id, conv.participants, currentUser.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      conv.id === activeConvId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {isGroup ? (
                      <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <Users className="size-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <Avatar size="sm">
                        {others[0]?.avatar_url && (
                          <AvatarImage src={others[0].avatar_url} alt={others[0].full_name ?? ""} />
                        )}
                        <AvatarFallback>{getInitials(others[0]?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm truncate", conv.unreadCount > 0 && conv.id !== activeConvId ? "font-bold" : "font-medium")}>
                        {title}
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
                );
              })}
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
            <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {isGroupActive ? (
                  <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                ) : (
                  <Avatar size="sm">
                    {activeOthers[0]?.avatar_url && (
                      <AvatarImage src={activeOthers[0].avatar_url} alt={activeOthers[0].full_name ?? ""} />
                    )}
                    <AvatarFallback>{getInitials(activeOthers[0]?.full_name ?? null)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conversationTitle(activeParticipants, currentUser?.id)}
                  </p>
                  {!isGroupActive && activeOthers[0]?.title && (
                    <p className="text-xs text-muted-foreground truncate">{activeOthers[0].title}</p>
                  )}
                </div>
              </div>

              <div className="relative shrink-0" ref={addPersonRef}>
                <button
                  type="button"
                  onClick={() => setAddPersonOpen((v) => !v)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Add person"
                >
                  <UserPlus className="size-4" />
                </button>
                {addPersonOpen && (
                  <div className="absolute top-full right-0 mt-1 w-72 rounded-xl border bg-background shadow-lg z-20 p-2">
                    <Input
                      autoFocus
                      placeholder="Add a person by name…"
                      value={addPersonQuery}
                      onChange={(e) => setAddPersonQuery(e.target.value)}
                      className="mb-1.5"
                    />
                    {addPersonQuery.trim().length < 2 ? (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">Type at least 2 characters…</p>
                    ) : addPersonSearching ? (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">Searching…</p>
                    ) : addPersonResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">No members found.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-0.5">
                        {addPersonResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddPerson(p)}
                            className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors"
                          >
                            <Avatar size="sm">
                              {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />}
                              <AvatarFallback>{getInitials(p.full_name)}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium truncate">{p.full_name ?? "Unknown"}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 px-4">
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
                        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          {isGroupActive && !isMe && !isGrouped && (
                            <p className="text-xs text-muted-foreground mb-0.5 px-1">
                              {msg.profiles?.full_name ?? "Unknown"}
                            </p>
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
                  ref={textareaRef}
                  placeholder={`Message ${conversationTitle(activeParticipants, currentUser?.id)}`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="min-h-[2.25rem] max-h-40 resize-none overflow-y-auto"
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
