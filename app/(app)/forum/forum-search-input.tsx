"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useRef } from "react";
import { Search, X } from "lucide-react";

interface Props {
  defaultValue?: string;
}

export default function ForumSearchInput({ defaultValue = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        if (value.trim()) {
          router.push(`${pathname}?q=${encodeURIComponent(value.trim())}`);
        } else {
          router.push(pathname);
        }
      });
    }, 300);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
        <Search className={`size-4 transition-colors ${isPending ? "text-[#8b5cf6] animate-pulse" : "text-zinc-400"}`} />
      </div>
      <input
        ref={inputRef}
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search forum topics…"
        className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all"
      />
      {defaultValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
