'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Google Calendar's Meet invites show two links: the actual video-join link
// (meet.google.com/xxx-xxxx-xxx) and a "Join by phone" dial-in link
// (tel.meet/xxx-xxxx-xxx?pin=...). They're easy to mix up — a real TALK
// event's virtual_url ended up set to the phone link, which does nothing
// useful when clicked in a browser, and the form had zero validation to
// catch it.
const PHONE_DIALIN_PATTERN = /^https?:\/\/(www\.)?tel\.meet\//i

export default function VirtualUrlInput({ id, name = 'virtual_url', defaultValue = '' }: { id: string; name?: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue)
  const isPhoneLink = PHONE_DIALIN_PATTERN.test(value.trim())

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Virtual URL</Label>
      <Input
        id={id}
        name={name}
        type="url"
        placeholder="https://zoom.us/…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {isPhoneLink && (
        <p className="text-xs font-medium text-amber-600">
          This looks like Google Meet&apos;s &ldquo;Join by phone&rdquo; dial-in link, not the actual meeting
          link — it won&apos;t let anyone join by video. Paste the one that starts with meet.google.com instead.
        </p>
      )}
    </div>
  )
}
