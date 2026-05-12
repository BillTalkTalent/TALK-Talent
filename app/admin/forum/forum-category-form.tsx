"use client";

import { useState, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  sort_order: number;
};

interface Props {
  action: (formData: FormData) => Promise<void>;
  category?: Category;
  trigger?: ReactNode;
}

export default function ForumCategoryForm({ action, category, trigger }: Props) {
  const [open, setOpen] = useState(!trigger); // inline form if no trigger
  const formRef = useRef<HTMLFormElement>(null);

  function slugify(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleAction(formData: FormData) {
    await action(formData);
    if (trigger) {
      setOpen(false);
    } else {
      formRef.current?.reset();
    }
  }

  if (trigger && !open) {
    return <span onClick={() => setOpen(true)}>{trigger}</span>;
  }

  return (
    <div className={trigger ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" : ""}>
      <form
        ref={formRef}
        action={handleAction}
        className={
          trigger
            ? "w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            : "space-y-4"
        }
      >
        {trigger && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-zinc-900">Edit Category</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="size-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {category && <input type="hidden" name="id" value={category.id} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={category?.name}
              placeholder="e.g. Sourcing & Attraction"
              onChange={(e) => {
                // Auto-fill slug if empty
                const slugInput = formRef.current?.querySelector<HTMLInputElement>('[name="slug"]');
                if (slugInput && (!slugInput.value || slugInput.value === slugify(category?.name ?? ""))) {
                  slugInput.value = slugify(e.target.value);
                }
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={category?.slug}
              placeholder="sourcing-attraction"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="icon">Icon (emoji)</Label>
            <Input
              id="icon"
              name="icon"
              defaultValue={category?.icon ?? ""}
              placeholder="🔍"
              className="text-lg"
              maxLength={4}
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={category?.description ?? ""}
              placeholder="What topics belong in this category?"
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={category?.sort_order ?? 0}
              min={0}
              step={1}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          {trigger && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" className="bg-[#00b894] hover:bg-[#00a884] text-white">
            {category ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </div>
  );
}
