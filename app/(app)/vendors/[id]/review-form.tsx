'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  vendorId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingReview: any | null
}

function StarPicker({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-zinc-500 block mb-1">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-2xl leading-none transition-colors ${n <= value ? 'text-amber-400' : 'text-zinc-300 hover:text-amber-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewForm({ vendorId, existingReview }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [overall, setOverall] = useState<number>(existingReview?.overall_rating ?? 0)
  const [ease, setEase] = useState<number>(existingReview?.ease_of_use_rating ?? 0)
  const [support, setSupport] = useState<number>(existingReview?.support_rating ?? 0)
  const [value, setValue] = useState<number>(existingReview?.value_rating ?? 0)
  const [pros, setPros] = useState<string>(existingReview?.pros ?? '')
  const [cons, setCons] = useState<string>(existingReview?.cons ?? '')
  const [summary, setSummary] = useState<string>(existingReview?.summary ?? '')
  const [tenureMonths, setTenureMonths] = useState<string>(existingReview?.tenure_months?.toString() ?? '')
  const [selectedIt, setSelectedIt] = useState<string>(
    existingReview?.selected_it === true ? 'yes' : existingReview?.selected_it === false ? 'no' : ''
  )
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overall < 1) {
      toast.error('Overall rating is required')
      return
    }
    if (!summary.trim()) {
      toast.error('Summary is required')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be signed in')
      setSaving(false)
      return
    }
    const payload = {
      vendor_id: vendorId,
      reviewer_id: user.id,
      overall_rating: overall,
      ease_of_use_rating: ease || null,
      support_rating: support || null,
      value_rating: value || null,
      pros: pros || null,
      cons: cons || null,
      summary: summary.trim(),
      tenure_months: tenureMonths ? parseInt(tenureMonths, 10) : null,
      selected_it: selectedIt === 'yes' ? true : selectedIt === 'no' ? false : null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('vendor_reviews')
      .upsert(payload, { onConflict: 'vendor_id,reviewer_id' })
    setSaving(false)
    if (error) {
      toast.error('Failed to save review: ' + error.message)
      return
    }
    toast.success('Review saved!')
    router.push(`/vendors/${vendorId}?tab=reviews`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StarPicker value={overall} onChange={setOverall} label="Overall *" />
        <StarPicker value={ease} onChange={setEase} label="Ease of Use" />
        <StarPicker value={support} onChange={setSupport} label="Support" />
        <StarPicker value={value} onChange={setValue} label="Value" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Summary *</Label>
        <textarea
          id="summary"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          required
          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
          placeholder="Overall, how was your experience with this vendor?"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pros">Pros</Label>
          <textarea
            id="pros"
            value={pros}
            onChange={e => setPros(e.target.value)}
            rows={3}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cons">Cons</Label>
          <textarea
            id="cons"
            value={cons}
            onChange={e => setCons(e.target.value)}
            rows={3}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F07058]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tenure">How long have you used this vendor?</Label>
          <select
            id="tenure"
            value={tenureMonths}
            onChange={e => setTenureMonths(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#F07058]"
          >
            <option value="">Not specified</option>
            <option value="1">&lt; 3 months</option>
            <option value="6">3–6 months</option>
            <option value="12">6–12 months</option>
            <option value="24">1–2 years</option>
            <option value="36">2–3 years</option>
            <option value="60">3+ years</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="selected">Did you select this vendor?</Label>
          <select
            id="selected"
            value={selectedIt}
            onChange={e => setSelectedIt(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#F07058]"
          >
            <option value="">Not specified</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
          {saving ? 'Saving…' : existingReview ? 'Update Review' : 'Submit Review'}
        </Button>
      </div>
    </form>
  )
}
