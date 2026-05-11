"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type JobType = "full-time" | "part-time" | "contract" | "fractional" | "interim";

export default function NewJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [jobType, setJobType] = useState<JobType>("full-time");
  const [seniority, setSeniority] = useState("");
  const [description, setDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  // Pre-fill company from user profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company")
        .eq("id", user.id)
        .single();
      if (profile?.company) setCompany(profile.company);
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to post a job.");
      setSubmitting(false);
      return;
    }

    const { data: job, error } = await supabase
      .from("job_posts")
      .insert({
        poster_id: user.id,
        title: title.trim(),
        company: company.trim(),
        location: location.trim() || null,
        is_remote: isRemote,
        job_type: jobType,
        seniority: seniority.trim() || null,
        description: description.trim(),
        company_url: companyUrl.trim() || null,
        apply_url: applyUrl.trim() || null,
        apply_email: applyEmail.trim() || null,
        salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
        salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to post job. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Job posted!");
    router.push(`/jobs/${job.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/jobs" className="hover:underline">Job Board</Link>
        <span>/</span>
        <span>Post a Job</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post a Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                placeholder="e.g. Head of Talent Acquisition"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="company">Company <span className="text-destructive">*</span></Label>
              <Input
                id="company"
                placeholder="Company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* Company Website */}
            <div className="space-y-1.5">
              <Label htmlFor="companyUrl">Company Website</Label>
              <Input
                id="companyUrl"
                type="url"
                placeholder="https://acme.com"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">Used to display your company logo on the listing.</p>
            </div>

            {/* Location + Remote */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="invisible">Remote</Label>
                <label className="flex items-center gap-2 h-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    disabled={submitting}
                    className="size-4 rounded"
                  />
                  <span className="text-sm">Remote position</span>
                </label>
              </div>
            </div>

            {/* Job Type + Seniority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobType">Job Type</Label>
                <select
                  id="jobType"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as JobType)}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="fractional">Fractional</option>
                  <option value="interim">Interim</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seniority">Seniority</Label>
                <Input
                  id="seniority"
                  placeholder="e.g. Senior, Director, VP"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                required
                disabled={submitting}
              />
            </div>

            {/* How to Apply */}
            <div className="space-y-3">
              <p className="text-sm font-medium">How to Apply</p>
              <div className="space-y-1.5">
                <Label htmlFor="applyUrl">Application URL</Label>
                <Input
                  id="applyUrl"
                  type="url"
                  placeholder="https://..."
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="applyEmail">Or Application Email</Label>
                <Input
                  id="applyEmail"
                  type="email"
                  placeholder="hiring@company.com"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Salary */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Salary Range (optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="salaryMin">Min (USD)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    placeholder="e.g. 120000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    min={0}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salaryMax">Max (USD)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    placeholder="e.g. 180000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    min={0}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !company.trim() || !description.trim()}
              >
                {submitting ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
