'use client'

import { Button } from '@/components/ui/button'

// Deleting an event is permanent (RSVPs/registrations cascade away with it),
// so require an explicit confirmation before the server action runs.
export default function DeleteEventButton({ title }: { title: string }) {
  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      onClick={(e) => {
        if (!confirm(`Permanently delete "${title}"?\n\nThis also removes its RSVPs and cannot be undone.`)) {
          e.preventDefault()
        }
      }}
    >
      Delete
    </Button>
  )
}
