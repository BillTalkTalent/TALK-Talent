// Shared between the "post a job" and "edit job" forms so the preset list
// and the date math behind it can't drift between the two.
export const JOB_DURATION_OPTIONS = [
  { value: "", label: "No expiration" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
] as const

// '' (or an invalid value) means "no expiration" — null clears expires_at.
export function computeExpiresAt(durationDays: string): string | null {
  const days = parseInt(durationDays, 10)
  if (!days || days <= 0) return null
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}
