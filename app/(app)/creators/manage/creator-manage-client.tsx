"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Plus, Play, FileText, Link as LinkIcon, Eye, EyeOff, Trash2 } from "lucide-react";

type Creator = {
  id: string;
  user_id: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  topics: string[] | null;
  is_featured: boolean;
  is_approved: boolean;
};

type Material = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  type: string;
  url: string;
  is_published: boolean;
};

const typeIcon: Record<string, React.ReactNode> = {
  video: <Play className="size-3" />,
  deck: <FileText className="size-3" />,
  link: <LinkIcon className="size-3" />,
};

export default function CreatorManageClient({
  userId,
  initialCreator,
  initialMaterials,
  defaultName,
  defaultAvatar,
}: {
  userId: string;
  initialCreator: Creator | null;
  initialMaterials: Material[];
  defaultName: string;
  defaultAvatar: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [creator, setCreator] = useState<Creator | null>(initialCreator);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    display_name: initialCreator?.display_name ?? defaultName,
    tagline: initialCreator?.tagline ?? "",
    bio: initialCreator?.bio ?? "",
    avatar_url: initialCreator?.avatar_url ?? defaultAvatar,
    website_url: initialCreator?.website_url ?? "",
    linkedin_url: initialCreator?.linkedin_url ?? "",
    youtube_url: initialCreator?.youtube_url ?? "",
    topics: (initialCreator?.topics ?? []).join(", "),
  });

  const [newMaterial, setNewMaterial] = useState({ title: "", type: "video", url: "" });
  const [addingMaterial, setAddingMaterial] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      display_name: form.display_name.trim(),
      tagline: form.tagline.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      website_url: form.website_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      topics: form.topics.split(",").map((t) => t.trim()).filter(Boolean),
    };

    if (creator) {
      const { error } = await db.from("creator_profiles").update(payload).eq("id", creator.id);
      setSaving(false);
      if (error) {
        toast.error("Failed to save: " + error.message);
        return;
      }
      toast.success("Creator profile updated!");
      router.refresh();
    } else {
      const { data, error } = await db.from("creator_profiles").insert(payload).select().single();
      setSaving(false);
      if (error) {
        toast.error("Failed to create: " + error.message);
        return;
      }
      setCreator(data);
      toast.success("Creator profile created! An admin needs to approve it before it's public.");
      router.refresh();
    }
  }

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!creator) return;
    if (!newMaterial.title.trim() || !newMaterial.url.trim()) {
      toast.error("Title and URL are required");
      return;
    }
    setAddingMaterial(true);
    const { data, error } = await db
      .from("creator_materials")
      .insert({
        creator_id: creator.id,
        title: newMaterial.title.trim(),
        type: newMaterial.type,
        url: newMaterial.url.trim(),
        is_published: false,
      })
      .select()
      .single();
    setAddingMaterial(false);
    if (error) {
      toast.error("Failed to add: " + error.message);
      return;
    }
    setMaterials((prev) => [data, ...prev]);
    setNewMaterial({ title: "", type: "video", url: "" });
    toast.success("Added as a draft — publish it when you're ready.");
  }

  async function togglePublished(m: Material) {
    const { error } = await db
      .from("creator_materials")
      .update({ is_published: !m.is_published, published_at: !m.is_published ? new Date().toISOString() : null })
      .eq("id", m.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      return;
    }
    setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_published: !m.is_published } : x)));
  }

  async function deleteMaterial(id: string) {
    const { error } = await db.from("creator_materials").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }
    setMaterials((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Manage Your Creator Page</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {creator
            ? "Edit your profile and post new resources."
            : "Set up your public creator profile to get started."}
        </p>
      </div>

      {creator && !creator.is_approved && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your creator profile isn&apos;t approved yet — it won&apos;t show up in the directory until an admin approves it.
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Profile</p>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Display name</label>
          <input
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Tagline</label>
          <input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="e.g. Fractional Head of TA · Author, The Sourcing Playbook"
            className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={4}
            className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Topics <span className="font-normal">(comma-separated)</span></label>
          <input
            value={form.topics}
            onChange={(e) => set("topics", e.target.value)}
            placeholder="Sourcing, AI Screening"
            className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Avatar URL</label>
          <input
            value={form.avatar_url}
            onChange={(e) => set("avatar_url", e.target.value)}
            className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Website</label>
            <input
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
              placeholder="https://…"
              className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">LinkedIn</label>
            <input
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
              placeholder="https://…"
              className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">YouTube</label>
            <input
              value={form.youtube_url}
              onChange={(e) => set("youtube_url", e.target.value)}
              placeholder="https://…"
              className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {creator ? "Save Changes" : "Create Creator Profile"}
          </button>
        </div>
      </form>

      {creator && (
        <>
          <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Share something new</p>
            <form onSubmit={handleAddMaterial} className="space-y-3">
              <input
                value={newMaterial.title}
                onChange={(e) => setNewMaterial((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="w-full text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <div className="flex gap-2">
                <select
                  value={newMaterial.type}
                  onChange={(e) => setNewMaterial((prev) => ({ ...prev, type: e.target.value }))}
                  className="text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
                >
                  <option value="video">Video</option>
                  <option value="deck">Deck</option>
                  <option value="link">Link</option>
                </select>
                <input
                  value={newMaterial.url}
                  onChange={(e) => setNewMaterial((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://…"
                  className="flex-1 text-sm border border-border bg-background text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={addingMaterial}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}
              >
                {addingMaterial ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add Resource
              </button>
            </form>
          </div>

          {materials.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3">Your Resources</h2>
              <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border">
                {materials.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="size-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                      {typeIcon[m.type] ?? typeIcon.link}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.is_published ? (
                          <span className="flex items-center gap-1 text-emerald-600"><Eye className="size-3" /> Published</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600"><EyeOff className="size-3" /> Draft — not visible yet</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePublished(m)}
                        title={m.is_published ? "Unpublish" : "Publish"}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {m.is_published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMaterial(m.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
