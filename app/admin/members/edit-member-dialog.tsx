'use client'

import { useActionState, useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import type { Profile } from '@/lib/supabase/types'
import type { UpdateProfileState } from './page'

export default function EditMemberDialog({
  member,
  updateMemberProfile,
}: {
  member: Profile
  updateMemberProfile: (id: string, prevState: UpdateProfileState, formData: FormData) => Promise<UpdateProfileState>
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(updateMemberProfile.bind(null, member.id), null)

  // Close the dialog once the save succeeds. Detected during render (React's
  // sanctioned way to react to a changed value without an effect's extra
  // render pass) by comparing against the last state we've already handled.
  const [handledState, setHandledState] = useState(state)
  if (state !== handledState) {
    setHandledState(state)
    if (state && 'ok' in state) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            title="Edit profile"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {member.full_name ?? 'member'}&apos;s profile</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`full_name-${member.id}`}>Full name</Label>
            <Input id={`full_name-${member.id}`} name="full_name" defaultValue={member.full_name ?? ''} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`email-${member.id}`}>Email</Label>
            <Input id={`email-${member.id}`} name="email" type="email" defaultValue={member.email} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`company-${member.id}`}>Company</Label>
              <Input id={`company-${member.id}`} name="company" defaultValue={member.company ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`title-${member.id}`}>Title</Label>
              <Input id={`title-${member.id}`} name="title" defaultValue={member.title ?? ''} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`linkedin_url-${member.id}`}>LinkedIn URL</Label>
            <Input id={`linkedin_url-${member.id}`} name="linkedin_url" type="url" defaultValue={member.linkedin_url ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`avatar_url-${member.id}`}>Avatar URL</Label>
            <Input id={`avatar_url-${member.id}`} name="avatar_url" type="url" defaultValue={member.avatar_url ?? ''} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`bio-${member.id}`}>Bio</Label>
            <Textarea id={`bio-${member.id}`} name="bio" rows={3} defaultValue={member.bio ?? ''} />
          </div>

          {state && 'error' in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
