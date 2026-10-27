'use client'

import { useActionState, useMemo, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/lib/supabase/types'
import type { ConvertToVendorState } from './page'

type VendorOption = { id: string; name: string }

export default function ConvertToVendorDialog({
  member,
  vendors,
  convertToVendor,
}: {
  member: Profile
  vendors: VendorOption[]
  convertToVendor: (id: string, prevState: ConvertToVendorState, formData: FormData) => Promise<ConvertToVendorState>
}) {
  const [open, setOpen] = useState(false)
  const [vendorText, setVendorText] = useState('')
  const [state, formAction, pending] = useActionState(convertToVendor.bind(null, member.id), null)

  const [handledState, setHandledState] = useState(state)
  if (state !== handledState) {
    setHandledState(state)
    if (state && 'ok' in state) setOpen(false)
  }

  // Native datalist — 483 vendors is too many for a plain <select>, and this
  // needs no new dependency. Typing a name that doesn't match an existing
  // listing falls through to new_vendor_name, which creates one.
  const matchedVendor = useMemo(
    () => vendors.find((v) => v.name.toLowerCase() === vendorText.trim().toLowerCase()),
    [vendors, vendorText],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            title="Convert to vendor"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          />
        }
      >
        <Building2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert {member.full_name ?? 'member'} to a vendor contact</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <p className="text-sm text-zinc-500">
            Removes their TALK member access and connects this login to a vendor listing instead — they&apos;ll
            keep signing in with the same email, just at the vendor portal.
          </p>
          <div className="space-y-1">
            <Label htmlFor={`vendor-${member.id}`}>Vendor</Label>
            <Input
              id={`vendor-${member.id}`}
              list={`vendor-options-${member.id}`}
              value={vendorText}
              onChange={(e) => setVendorText(e.target.value)}
              placeholder="Start typing a company name…"
              autoComplete="off"
            />
            <datalist id={`vendor-options-${member.id}`}>
              {vendors.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
            <p className="text-xs text-zinc-400">
              {matchedVendor
                ? `Matches the existing "${matchedVendor.name}" listing.`
                : vendorText.trim()
                  ? `No match — this will create a new vendor listing named "${vendorText.trim()}".`
                  : 'Pick an existing listing, or type a new company name to create one.'}
            </p>
            <input type="hidden" name="vendor_id" value={matchedVendor?.id ?? ''} />
            <input type="hidden" name="new_vendor_name" value={matchedVendor ? '' : vendorText.trim()} />
          </div>

          {state && 'error' in state && <p className="text-sm text-red-600">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending || !vendorText.trim()}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Converting…
                </>
              ) : (
                'Convert to vendor'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
