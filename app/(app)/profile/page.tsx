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
import { Camera, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileResult, chaptersResult, membershipsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("chapters").select("*").order("sort_order"),
        supabase.from("chapter_memberships").select("chapter_id").eq("user_id", user.id),
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
