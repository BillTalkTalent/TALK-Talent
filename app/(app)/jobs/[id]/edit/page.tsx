"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

type JobType = "full-time" | "part-time" | "contract" | "fractional" | "interim";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [jobType, setJobType] = useState<JobType>("full-time");
  const [seniority, setSeniority] = useState("");
  const [description, setDescription] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/jobs"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: job } = await (supabase as any).from("job_posts").select("*").eq("id", id).single();
      if (!job || job.poster_id !== user.id) {
        toast.error("You can only edit your own listings.");
        router.push(`/jobs/${id}`);
        return;
      }

      setTitle(job.title ?? "");
      setCompany(job.company ?? "");
      setCompanyUrl(job.company_url ?? "");
      setLocation(job.location ?? "");
      setIsRemote(job.is_remote ?? false);
      setJobType(job.job_type ?? "full-time");
      setSeniority(job.seniority ?? "");
      setDescription(job.description ?? "");
      setApplyUrl(job.apply_url ?? "");
      setApplyEmail(job.apply_email ?? "");
      setSalaryMin(job.salary_min ? String(job.salary_min) : "");
      setSalaryMax(job.salary_max ? String(job.salary_max) : "");
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) return;
    setSubmitting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("job_posts")
      .update({
        title: title.trim(),
        company: company.trim(),
        company_url: companyUrl.trim() || null,
        location: location.trim() || null,
        is_remote: isRemote,
        job_type: jobType,
        seniority: seniority.trim() || null,
        description: description.trim(),
        apply_url: applyUrl.trim() || null,
        apply_email: applyEmail.trim() || null,
        salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
        salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update listing.");
    } else {
      toast.success("Listing updated!");
      router.push(`/jobs/${id}`);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href={`/jobs/${id}`} className="hover:text-zinc-600 flex items-center gap-1">
          <ArrowLeft className="size-3.5" /> Back to listing
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6">
        <h1 className="text-lg font-bold text-zinc-900 mb-6">Edit Job Listing</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job Title <span className="text-red-500">*</span></Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required disabled={submitting} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company <span className="text-red-500">*</span></Label>
              <Input id="company" value={company} onChange={e => setCompany(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyUrl">Company Website</Label>
              <Input id="companyUrl" type="url" placeholder="https://acme.com" value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={e => setLocation(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label className="invisible">Remote</Label>
              <label className="flex items-center gap-2 h-10 cursor-pointer">
                <input type="checkbox" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} disabled={submitting} className="size-4 rounded" />
                <span className="text-sm">Remote position</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobType">Job Type</Label>
              <select id="jobType" value={jobType} onChange={e => setJobType(e.target.value as JobType)} disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="fractional">Fractional</option>
                <option value="interim">Interim</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seniority">Seniority</Label>
              <Input id="seniority" placeholder="e.g. Senior, Director, VP" value={seniority} onChange={e => setSeniority(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" rows={10} value={description} onChange={e => setDescription(e.target.value)} required disabled={submitting} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">How to Apply</p>
            <div className="space-y-1.5">
              <Label htmlFor="applyUrl">Application URL</Label>
              <Input id="applyUrl" type="url" placeholder="https://..." value={applyUrl} onChange={e => setApplyUrl(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="applyEmail">Or Application Email</Label>
              <Input id="applyEmail" type="email" value={applyEmail} onChange={e => setApplyEmail(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Salary Range (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="salaryMin">Min (USD)</Label>
                <Input id="salaryMin" type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} min={0} disabled={submitting} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salaryMax">Max (USD)</Label>
                <Input id="salaryMax" type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} min={0} disabled={submitting} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => router.push(`/jobs/${id}`)} disabled={submitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim() || !company.trim() || !description.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
