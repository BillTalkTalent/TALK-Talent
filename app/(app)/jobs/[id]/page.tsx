import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MapPin, ExternalLink, Mail } from "lucide-react";

const JOB_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  fractional: "Fractional",
  interim: "Interim",
};

function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)}–${fmt(max)} ${currency}`;
  if (min) return `${fmt(min)}+ ${currency}`;
  if (max) return `Up to ${fmt(max)} ${currency}`;
  return null;
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_posts")
    .select("*, profiles(id, full_name, company, title)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const applyHref = job.apply_url ?? (job.apply_email ? `mailto:${job.apply_email}` : null);
  const poster = job.profiles as { id: string; full_name: string | null; company: string | null; title: string | null } | null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Job Board
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          {job.is_featured && (
            <Badge className="bg-amber-400 text-amber-900 border-amber-400">Featured</Badge>
          )}
          <h1 className="text-2xl font-semibold leading-snug">{job.title}</h1>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground text-lg">{job.company}</span>
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {job.location}
            </span>
          )}
          {job.is_remote && <Badge variant="secondary">Remote</Badge>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Badge>
          {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
          {salary && (
            <span className="text-sm font-medium text-green-700 dark:text-green-400">{salary}</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Apply button */}
        {applyHref && (
          <div className="pt-1">
            <Button
              size="lg"
              render={<a href={applyHref} target="_blank" rel="noopener noreferrer" />}
            >
              {job.apply_url ? (
                <><ExternalLink className="size-4" /> Apply Now</>
              ) : (
                <><Mail className="size-4" /> Apply via Email</>
              )}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">About the Role</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {job.description}
        </p>
      </div>

      {/* Posted by */}
      {poster && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
              Posted by
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{poster.full_name ?? "Community Member"}</p>
                {(poster.title || poster.company) && (
                  <p className="text-sm text-muted-foreground">
                    {[poster.title, poster.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" render={<Link href={`/members/${poster.id}`} />}>
                View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
