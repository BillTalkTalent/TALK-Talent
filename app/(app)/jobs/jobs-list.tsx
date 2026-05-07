"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { JobPost } from "@/lib/supabase/types";

type JobWithPoster = JobPost & {
  profiles: { full_name: string | null; company: string | null } | null;
};

const JOB_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  fractional: "Fractional",
  interim: "Interim",
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "fractional", label: "Fractional" },
  { value: "interim", label: "Interim" },
];

function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export default function JobsList({ jobs }: { jobs: JobWithPoster[] }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);

  const filtered = jobs.filter((job) => {
    if (typeFilter !== "all" && job.job_type !== typeFilter) return false;
    if (remoteOnly && !job.is_remote) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-indigo-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRemoteOnly((v) => !v)}
          className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            remoteOnly
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Remote only
        </button>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No jobs match your filters.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => {
            const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
            const applyHref = job.apply_url ?? (job.apply_email ? `mailto:${job.apply_email}` : null);

            return (
              <div
                key={job.id}
                className="rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title row */}
                    <div className="flex items-start gap-2 flex-wrap">
                      {job.is_featured && (
                        <Badge className="bg-amber-400 text-amber-900 border-amber-400 shrink-0">
                          Featured
                        </Badge>
                      )}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-lg font-semibold hover:text-indigo-600 leading-snug"
                      >
                        {job.title}
                      </Link>
                    </div>

                    {/* Company + location */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">{job.company}</span>
                      {job.location && <span>· {job.location}</span>}
                      {job.is_remote && (
                        <Badge variant="secondary" className="text-xs">Remote</Badge>
                      )}
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Badge>
                      {job.seniority && (
                        <Badge variant="outline">{job.seniority}</Badge>
                      )}
                      {salary && (
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {salary}
                        </span>
                      )}
                    </div>

                    {/* Posted by + date */}
                    <p className="text-xs text-muted-foreground">
                      Posted by {job.profiles?.full_name ?? "Unknown"}{" "}
                      · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Apply button */}
                  {applyHref && (
                    <Button
                      size="sm"
                      className="shrink-0"
                      render={<a href={applyHref} target="_blank" rel="noopener noreferrer" />}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
