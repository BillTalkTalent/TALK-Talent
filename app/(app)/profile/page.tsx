"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Save, Loader2, Lock, Eye, EyeOff, Zap } from "lucide-react";
import type { Chapter, ChapterMembership, Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [joinedChapterIds, setJoinedChapterIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    title: "",
    company: "",
    bio: "",
    linkedin_url: "",
    avatar_url: "",
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Talent pool state
  const [talentEntry, setTalentEntry] = useState<{ id: string } | null>(null);
  const [isOpenToWork, setIsOpenToWork] = useState(false);
  const [talentForm, setTalentForm] = useState({
    headline: "",
    seeking: "",
    work_pref: "flexible",
    available_from: "",
  });
  const [savingTalent, setSavingTalent] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResult, chaptersResult, membershipsResult, talentResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("chapters").select("*").order("sort_order"),
        supabase.from("chapter_memberships").select("chapter_id").eq("user_id", user.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("talent_pool").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profileResult.data) {
        const d = profileResult.data;
        setProfile(d);
        setForm({
          full_name: d.full_name ?? "",
          title: d.title ?? "",
          company: d.company ?? "",
          bio: d.bio ?? "",
          linkedin_url: d.linkedin_url ?? "",
          avatar_url: d.avatar_url ?? "",
        });
      }
      setChapters(chaptersResult.data ?? []);
      setJoinedChapterIds(new Set((membershipsResult.data ?? []).map((m) => m.chapter_id)));

      if (talentResult.data) {
        const t = talentResult.data;
        setTalentEntry({ id: t.id });
        setIsOpenToWork(true);
        setTalentForm({
          headline: t.headline ?? "",
          seeking: t.seeking ?? "",
          work_pref: t.work_pref ?? "flexible",
          available_from: t.available_from ?? "",
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }

    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploadingPhoto(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    // Add cache-buster so the browser reloads the image
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: urlWithBust }).eq("id", profile.id);
    setForm((prev) => ({ ...prev, avatar_url: urlWithBust }));
    toast.success("Photo updated!");
    setUploadingPhoto(false);
  }

  // ── Chapter toggle ────────────────────────────────────────────────────────
  async function toggleChapter(chapterId: string) {
    if (!profile) return;
    const joined = joinedChapterIds.has(chapterId);

    // Optimistic update
    setJoinedChapterIds((prev) => {
      const next = new Set(prev);
      joined ? next.delete(chapterId) : next.add(chapterId);
      return next;
    });

    if (joined) {
      await supabase.from("chapter_memberships")
        .delete()
        .eq("chapter_id", chapterId)
        .eq("user_id", profile.id);
    } else {
      await supabase.from("chapter_memberships")
        .insert({ chapter_id: chapterId, user_id: profile.id });
    }
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      title: form.title || null,
      company: form.company || null,
      bio: form.bio || null,
      linkedin_url: form.linkedin_url || null,
    }).eq("id", profile.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save profile.");
    } else {
      toast.success("Profile saved!");
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPw(true);
    // Supabase doesn't have a "change password with current password" API at the client level,
    // so we re-authenticate first then update
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email ?? "",
      password: pwForm.current,
    });
    if (signInError) {
      toast.error("Current password is incorrect");
      setSavingPw(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setSavingPw(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      setPwForm({ current: "", next: "", confirm: "" });
    }
  };

  // ── Talent pool ──────────────────────────────────────────────────────────
  const handleTalentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingTalent(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const payload = {
      user_id: profile.id,
      headline: talentForm.headline,
      seeking: talentForm.seeking,
      work_pref: talentForm.work_pref,
      available_from: talentForm.available_from || null,
    };
    if (talentEntry) {
      const { error } = await db.from("talent_pool").update(payload).eq("id", talentEntry.id);
      if (error) { toast.error("Failed to update: " + error.message); setSavingTalent(false); return; }
    } else {
      const { data, error } = await db.from("talent_pool").insert(payload).select("id").single();
      if (error) { toast.error("Failed to save: " + error.message); setSavingTalent(false); return; }
      if (data) setTalentEntry({ id: data.id });
    }
    setSavingTalent(false);
    setIsOpenToWork(true);
    toast.success("Talent pool profile saved!");
  };

  const handleTalentRemove = async () => {
    if (!profile || !talentEntry) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("talent_pool").delete().eq("id", talentEntry.id);
    setTalentEntry(null);
    setIsOpenToWork(false);
    setTalentForm({ headline: "", seeking: "", work_pref: "flexible", available_from: "" });
    toast.success("Removed from talent pool.");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage how you appear to the TALK community
        </p>
      </div>

      {/* ── Photo + basic info ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile Info</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-5">

            {/* Avatar upload */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <Avatar className="size-20 ring-2 ring-border">
                  {form.avatar_url && (
                    <AvatarImage src={form.avatar_url} alt={form.full_name} />
                  )}
                  <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700 font-semibold">
                    {getInitials(form.full_name || null)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingPhoto
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <Camera className="size-5 text-white" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click the photo to upload. JPG, PNG or WebP, max 5MB.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? "Uploading..." : "Change photo"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" value={form.full_name}
                  onChange={handleChange} placeholder="Jane Smith" disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" name="title" value={form.title}
                  onChange={handleChange} placeholder="Senior Recruiter" disabled={saving} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" value={form.company}
                onChange={handleChange} placeholder="Acme Corp" disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={form.bio}
                onChange={handleChange} placeholder="Tell the community about yourself..."
                rows={4} disabled={saving} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" type="url" value={form.linkedin_url}
                onChange={handleChange} placeholder="https://linkedin.com/in/yourprofile"
                disabled={saving} />
            </div>

            {profile && (
              <p className="text-xs text-muted-foreground">
                Account: {profile.email} · {profile.role}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Security / password ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-zinc-400" />
            Security
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Change your password. Leave blank if you signed in with a magic link.
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_pw">Current password</Label>
              <div className="relative">
                <Input
                  id="current_pw"
                  type={showPw ? "text" : "password"}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="Current password"
                  disabled={savingPw}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new_pw">New password</Label>
                <Input
                  id="new_pw"
                  type={showPw ? "text" : "password"}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  disabled={savingPw}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_pw">Confirm new password</Label>
                <Input
                  id="confirm_pw"
                  type={showPw ? "text" : "password"}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                  disabled={savingPw}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={savingPw || !pwForm.current || !pwForm.next}
              >
                {savingPw ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Lock className="size-4 mr-1.5" />}
                {savingPw ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Talent pool ── */}
      <Card id="talent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-[#00b894]" />
            Open to Work
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Let the community know you&apos;re open to new opportunities. You control when to show and remove yourself.
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {isOpenToWork ? "You're currently in the talent pool" : "You're not in the talent pool"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isOpenToWork
                  ? "Visible to all approved members on the Talent Pool page."
                  : "Add yourself to let others know you're looking."}
              </p>
            </div>
            {isOpenToWork && talentEntry && (
              <button
                type="button"
                onClick={handleTalentRemove}
                className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Remove me
              </button>
            )}
          </div>

          {/* Form — always shown so they can fill before toggling */}
          <form onSubmit={handleTalentSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tp_headline">Headline <span className="text-zinc-400 font-normal">(your pitch in one line)</span></Label>
              <input
                id="tp_headline"
                type="text"
                value={talentForm.headline}
                onChange={e => setTalentForm(f => ({ ...f, headline: e.target.value }))}
                placeholder="Senior TA Leader available for Head of Talent or consulting roles"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors"
                disabled={savingTalent}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp_seeking">What you&apos;re looking for</Label>
              <input
                id="tp_seeking"
                type="text"
                value={talentForm.seeking}
                onChange={e => setTalentForm(f => ({ ...f, seeking: e.target.value }))}
                placeholder="VP Talent Acquisition, Head of TA, Fractional TA leadership"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors"
                disabled={savingTalent}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tp_pref">Work preference</Label>
                <select
                  id="tp_pref"
                  value={talentForm.work_pref}
                  onChange={e => setTalentForm(f => ({ ...f, work_pref: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#00d4aa] transition-colors"
                  disabled={savingTalent}
                >
                  <option value="flexible">Flexible</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tp_available">Available from <span className="text-zinc-400 font-normal">(optional)</span></Label>
                <input
                  id="tp_available"
                  type="date"
                  value={talentForm.available_from}
                  onChange={e => setTalentForm(f => ({ ...f, available_from: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa] transition-colors"
                  disabled={savingTalent}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingTalent || !talentForm.headline.trim() || !talentForm.seeking.trim()}
                style={{ background: "linear-gradient(135deg, #00b894, #00d4aa)" }}
                className="text-white font-semibold"
              >
                {savingTalent
                  ? <Loader2 className="size-4 animate-spin" />
                  : <Zap className="size-4" />}
                {savingTalent ? "Saving…" : isOpenToWork ? "Update my listing" : "Add me to the talent pool"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Chapter memberships ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My Chapters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Join the topic areas that match your focus. These appear on your profile.
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {chapters.map((chapter) => {
              const joined = joinedChapterIds.has(chapter.id);
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => toggleChapter(chapter.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    joined
                      ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-border hover:border-indigo-300 hover:bg-muted/40"
                  )}
                >
                  <span className="text-2xl leading-none mt-0.5">{chapter.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", joined && "text-indigo-700")}>
                        {chapter.name}
                      </p>
                      {joined && (
                        <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                          Joined
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {chapter.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
