"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayFromRaw, rawFromDisplay, type DisplayMention } from "@/lib/mentions";

type MemberResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// Finds the contiguous region that changed between two strings (common
// prefix/suffix trick) — used to shift or invalidate tracked mention ranges
// after an edit, without assuming edits are single keystrokes (paste,
// selection-delete, etc. all work).
function diffRegion(oldStr: string, newStr: string): { start: number; oldEnd: number; newEnd: number } {
  let start = 0;
  const maxStart = Math.min(oldStr.length, newStr.length);
  while (start < maxStart && oldStr[start] === newStr[start]) start++;
  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  return { start, oldEnd, newEnd };
}

// Adjusts tracked mention ranges after an edit: mentions entirely before or
// after the edited region shift/stay put; a mention the edit touches is
// dropped (the user changed the tagged text, so it's no longer a valid tag).
function reconcileMentions(
  mentions: DisplayMention[],
  region: { start: number; oldEnd: number; newEnd: number }
): DisplayMention[] {
  const delta = (region.newEnd - region.start) - (region.oldEnd - region.start);
  const next: DisplayMention[] = [];
  for (const m of mentions) {
    if (m.end <= region.start) {
      next.push(m);
    } else if (m.start >= region.oldEnd) {
      next.push({ ...m, start: m.start + delta, end: m.end + delta });
    }
    // else: edit overlaps this mention's range — drop it.
  }
  return next;
}

interface MentionTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

// Textarea with an "@" typeahead — type @ followed by a name, pick someone
// from the dropdown, and it inserts a tag. While composing, the box shows
// plain "@Full Name" text (not the raw `@[Full Name](userId)` token) so it
// doesn't read as confusing markup; `value`/`onChange` still carry the raw
// token form, since that's what the reply/topic mention-notify routes parse
// and what topic-view.tsx renders as a link.
export default function MentionTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled,
  required,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [results, setResults] = useState<MemberResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const initial = displayFromRaw(value);
  const [displayValue, setDisplayValue] = useState(initial.display);
  const [mentions, setMentions] = useState<DisplayMention[]>(initial.mentions);
  // The raw value we last emitted via onChange, so we can tell an external
  // reset (parent clearing the field, loading different initial content)
  // apart from the echo of our own change.
  const lastEmittedRaw = useRef(value);

  // The @-triggered query's start/end offsets in `displayValue`, so a pick
  // can replace exactly that span.
  const triggerRef = useRef<{ start: number; end: number } | null>(null);

  // If `value` changed to something we didn't just emit ourselves, it's an
  // external change (form reset after submit, different initial content) —
  // re-derive the display text and mention ranges from it.
  useEffect(() => {
    if (value === lastEmittedRaw.current) return;
    const { display, mentions: nextMentions } = displayFromRaw(value);
    setDisplayValue(display);
    setMentions(nextMentions);
    lastEmittedRaw.current = value;
     
  }, [value]);

  function emit(nextDisplay: string, nextMentions: DisplayMention[]) {
    setDisplayValue(nextDisplay);
    setMentions(nextMentions);
    const raw = rawFromDisplay(nextDisplay, nextMentions);
    lastEmittedRaw.current = raw;
    onChange(raw);
  }

  // Find the "@query" token immediately before the cursor, if any — must
  // start at the beginning of the text or right after whitespace. Full names
  // have spaces ("Kimberly Foley"), so a single space doesn't end the query —
  // only a line break, a double space, or the token growing implausibly long
  // mean the user has moved on to typing something else.
  function findTrigger(text: string, cursor: number): { start: number; end: number } | null {
    const upToCursor = text.slice(0, cursor);
    const at = upToCursor.lastIndexOf("@");
    if (at === -1) return null;
    if (at > 0 && !/\s/.test(upToCursor[at - 1])) return null;
    const query = upToCursor.slice(at + 1);
    if (/\n/.test(query)) return null;
    if (/ {2,}/.test(query)) return null;
    if (query.length > 40) return null;
    return { start: at, end: cursor };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextDisplay = e.target.value;
    const region = diffRegion(displayValue, nextDisplay);
    const nextMentions = reconcileMentions(mentions, region);
    emit(nextDisplay, nextMentions);

    const cursor = e.target.selectionStart ?? nextDisplay.length;
    const trigger = findTrigger(nextDisplay, cursor);
    if (trigger) {
      triggerRef.current = trigger;
      setOpen(true);
      setHighlighted(0);
    } else {
      triggerRef.current = null;
      setOpen(false);
    }
  }

  // Debounced search against the trigger query.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const query = displayValue.slice(trigger.start + 1, trigger.end);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/members/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.members ?? []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
     
  }, [displayValue, open]);

  function pick(member: MemberResult) {
    const trigger = triggerRef.current;
    if (!trigger || !member.full_name) return;
    const token = `@${member.full_name}`;
    const nextDisplay = displayValue.slice(0, trigger.start) + token + " " + displayValue.slice(trigger.end);
    const inserted = token.length + 1;
    const removed = trigger.end - trigger.start;
    const delta = inserted - removed;
    const shifted = mentions.map((m) =>
      m.start >= trigger.end ? { ...m, start: m.start + delta, end: m.end + delta } : m
    );
    const newMention: DisplayMention = { id: member.id, name: member.full_name, start: trigger.start, end: trigger.start + token.length };
    const nextMentions = [...shifted, newMention].sort((a, b) => a.start - b.start);
    emit(nextDisplay, nextMentions);
    setOpen(false);
    setResults([]);
    const cursor = trigger.start + token.length + 1;
    triggerRef.current = null;
    // Restore focus + cursor right after the inserted token.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={className}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(m); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                i === highlighted ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <Avatar size="sm">
                {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name ?? ""} />}
                <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                {(m.title || m.company) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[m.title, m.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
