"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Loader2 } from "lucide-react";

type VendorAccount = {
  id: string;
  vendor_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  vendors: { name: string } | null;
  wasConvertedMember: boolean;
};

export default function VendorAccountHolders({
  accounts,
  onConvertBack,
}: {
  accounts: VendorAccount[];
  onConvertBack: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  function handleConvertBack(id: string) {
    setActingId(id);
    startTransition(async () => {
      await onConvertBack(id);
      setActingId(null);
    });
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {accounts.map((account) => (
        <li key={account.id} className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">
              {account.full_name ?? account.email}
              {account.wasConvertedMember && (
                <Badge variant="secondary" className="ml-2 text-[10px]">Former member</Badge>
              )}
            </p>
            <p className="text-sm text-zinc-500">
              {account.email} · manages <span className="font-medium">{account.vendors?.name ?? "Unknown vendor"}</span> · since{" "}
              {format(new Date(account.created_at), "MMM d, yyyy")}
            </p>
          </div>
          {account.wasConvertedMember && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConvertBack(account.id)}
              disabled={isPending && actingId === account.id}
              className="gap-1.5 shrink-0"
            >
              {isPending && actingId === account.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Convert back to member
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
