"use client";

import { useState, useTransition } from "react";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "planned", label: "Planned" },
  { value: "shipped", label: "Shipped" },
  { value: "declined", label: "Declined" },
];

export default function StatusSelect({
  suggestionId,
  status,
  setStatus,
}: {
  suggestionId: string;
  status: string;
  setStatus: (id: string, status: string) => Promise<void>;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    startTransition(() => setStatus(suggestionId, next));
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs font-semibold rounded-lg border border-zinc-200 px-2 py-1 bg-white disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
