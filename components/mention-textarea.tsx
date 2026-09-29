"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
// from the dropdown, and it inserts `@[Full Name](userId)` at the cursor.
// That token (see lib/mentions.ts) is what the reply/topic mention-notify
// routes parse back out to know who to notify, and what topic-view.tsx
// renders as a real link instead of raw text.
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
  // The @-triggered query's start/end offsets in `value`, so a pick can
  // replace exactly that span.
  const triggerRef = useRef<{ start: number; end: number } | null>(null);

  // Find the "@query" token immediately before the cursor, if any — must
  // start at the beginning of the text or right after whitespace, and have
  // no whitespace between the @ and the cursor.
  function findTrigger(text: string, cursor: number): { start: number; end: number } | null {
    const upToCursor = text.slice(0, cursor);
    const at = upToCursor.lastIndexOf("@");
    if (at === -1) return null;
    if (at > 0 && !/\s/.test(upToCursor[at - 1])) return null;
    const query = upToCursor.slice(at + 1);
    if (/\s/.test(query)) return null;
    return { start: at, end: cursor };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const cursor = e.target.selectionStart ?? text.length;
    const trigger = findTrigger(text, cursor);
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
    const query = value.slice(trigger.start + 1, trigger.end);
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
  }, [value, open]);

  function pick(member: MemberResult) {
    const trigger = triggerRef.current;
    if (!trigger || !member.full_name) return;
    const token = `@[${member.full_name}](${member.id}) `;
    const next = value.slice(0, trigger.start) + token + value.slice(trigger.end);
    onChange(next);
    setOpen(false);
    setResults([]);
    const cursor = trigger.start + token.length;
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
        value={value}
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
