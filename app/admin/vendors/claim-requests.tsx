"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Building2 } from "lucide-react";
import { toast } from "sonner";

type ClaimRequest = {
  id: string;
  vendor_id: string;
  full_name: string;
  email: string;
  title: string | null;
  note: string | null;
  created_at: string;
  vendors: { name: string; logo_url: string | null } | null;
};

export default function ClaimRequests({
  requests,
  onApprove,
  onReject,
}: {
  requests: ClaimRequest[];
  onApprove: (requestId: string, vendorId: string, email: string, fullName: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  function handleApprove(req: ClaimRequest) {
    setActingId(req.id);
    startTransition(async () => {
      try {
        await onApprove(req.id, req.vendor_id, req.email, req.full_name);
        toast.success(`Approved — invite sent to ${req.email}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve.");
      } finally {
        setActingId(null);
      }
    });
  }

  function handleReject(req: ClaimRequest) {
    setActingId(req.id);
    startTransition(async () => {
      await onReject(req.id);
      setActingId(null);
    });
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {requests.map((req) => (
        <li key={req.id} className="py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {req.vendors?.logo_url ? (
              <img src={req.vendors.logo_url} alt={req.vendors.name} className="size-10 rounded-lg object-contain border border-zinc-100 bg-white p-1 flex-shrink-0" />
            ) : (
              <div className="size-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="size-4 text-zinc-400" />
              </div>
            )}
            <div className="space-y-0.5 min-w-0">
              <p className="font-medium text-zinc-900">{req.vendors?.name ?? "Unknown vendor"}</p>
              <p className="text-sm text-zinc-600">
                {req.full_name} {req.title && <span className="text-zinc-400">· {req.title}</span>} — {req.email}
              </p>
              {req.note && <p className="text-sm text-zinc-400">{req.note}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => handleApprove(req)}
              disabled={isPending && actingId === req.id}
              className="gap-1.5"
            >
              <Check className="size-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(req)}
              disabled={isPending && actingId === req.id}
              className="gap-1.5"
            >
              <X className="size-3.5" /> Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
