"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Check, X, Plus, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  price_label: string | null;
  is_active: boolean;
  sort_order: number;
};

type Form = { title: string; description: string; price_label: string; is_active: boolean };

const emptyForm: Form = { title: "", description: "", price_label: "", is_active: true };

export default function SponsorshipOpportunities({ opportunities }: { opportunities: Opportunity[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(o: Opportunity) {
    setEditingId(o.id);
    setAdding(false);
    setForm({
      title: o.title,
      description: o.description ?? "",
      price_label: o.price_label ?? "",
      is_active: o.is_active,
    });
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm(emptyForm);
  }

  function cancel() {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  }

  function save(id?: string) {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    startTransition(async () => {
      const supabase = createClient();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price_label: form.price_label.trim() || null,
        is_active: form.is_active,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error } = id
        ? await db.from("sponsorship_opportunities").update(payload).eq("id", id)
        : await db.from("sponsorship_opportunities").insert(payload);

      if (error) { toast.error(error.message); return; }
      toast.success(id ? "Opportunity updated." : "Opportunity added.");
      cancel();
      router.refresh();
    });
  }

  function toggleActive(o: Opportunity) {
    startTransition(async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("sponsorship_opportunities")
        .update({ is_active: !o.is_active })
        .eq("id", o.id);
      if (error) { toast.error(error.message); return; }
      router.refresh();
    });
  }

  function remove(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("sponsorship_opportunities").delete().eq("id", id);
      setDeletingId(null);
      if (error) { toast.error(error.message); return; }
      toast.success("Opportunity removed.");
      router.refresh();
    });
  }

  const formFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Newsletter masthead sponsorship" />
      </div>
      <div className="space-y-1.5">
        <Label>Price</Label>
        <Input value={form.price_label} onChange={(e) => setForm((f) => ({ ...f, price_label: e.target.value }))} placeholder="e.g. Starting at $800/mo" />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <input
          type="checkbox"
          id="opp-active"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="size-4 rounded border-zinc-300"
        />
        <Label htmlFor="opp-active" className="cursor-pointer">Visible to vendors</Label>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Description</Label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <Button size="sm" type="button" disabled={isPending} onClick={() => save(editingId ?? undefined)} className="gap-1.5">
          {isPending && <Loader2 className="size-3.5 animate-spin" />} <Check className="size-3.5" /> Save
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={cancel} className="gap-1.5">
          <X className="size-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {opportunities.length === 0 && !adding && (
        <p className="text-sm text-zinc-400 italic">No sponsorship opportunities published yet.</p>
      )}

      {opportunities.map((o) =>
        editingId === o.id ? (
          <div key={o.id}>{formFields}</div>
        ) : (
          <div key={o.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-white p-4">
            <div className="flex items-start gap-2.5">
              <Megaphone className="size-4 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-zinc-900">{o.title}</p>
                  {o.price_label && <span className="text-xs font-semibold text-violet-700">{o.price_label}</span>}
                  {o.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Visible</Badge>
                  ) : (
                    <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100">Hidden</Badge>
                  )}
                </div>
                {o.description && <p className="text-sm text-zinc-500 mt-0.5">{o.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => toggleActive(o)} disabled={isPending} className="gap-1.5 text-xs">
                {o.is_active ? "Hide" : "Show"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => startEdit(o)} className="size-8">
                <Pencil className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(o.id)} disabled={deletingId === o.id} className="size-8 text-zinc-400 hover:text-red-500">
                {deletingId === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </div>
          </div>
        )
      )}

      {adding ? formFields : (
        <Button size="sm" variant="outline" type="button" onClick={startAdd} className="gap-1.5">
          <Plus className="size-3.5" /> Add opportunity
        </Button>
      )}
    </div>
  );
}
