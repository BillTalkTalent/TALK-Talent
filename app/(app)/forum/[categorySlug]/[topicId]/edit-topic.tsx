"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditTopicProps {
  topicId: string;
  initialTitle: string;
  initialBody: string;
  onSaved: (title: string, body: string) => void;
}

export default function EditTopic({ topicId, initialTitle, initialBody, onSaved }: EditTopicProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("forum_topics")
      .update({ title: title.trim(), body: body.trim() })
      .eq("id", topicId);

    if (error) {
      toast.error("Failed to save changes.");
    } else {
      toast.success("Post updated.");
      onSaved(title.trim(), body.trim());
      setEditing(false);
    }
    setSaving(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        title="Edit post"
      >
        <Pencil className="size-3" /> Edit
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-base font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6] transition-colors"
        disabled={saving}
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={8}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6] transition-colors resize-none"
        disabled={saving}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !title.trim() || !body.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-semibold hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          Save
        </button>
        <button
          onClick={() => { setEditing(false); setTitle(initialTitle); setBody(initialBody); }}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
        >
          <X className="size-3" /> Cancel
        </button>
      </div>
    </div>
  );
}
