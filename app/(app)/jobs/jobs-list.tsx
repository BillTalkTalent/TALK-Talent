"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import type { JobPost } from "@/lib/supabase/types";

type JobWithPoster = JobPost & {
  company_url?: string | null;
  profiles: { full_name: string | null; company: string | null } | null;
};

const JOB_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  fractional: "Fractional",
  interim: "Interim",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  "full-time":  "bg-blue-50 text-blue-700 border-blue-100",
  "part-time":  "bg-purple-50 text-purple-700 border-purple-100",
  contract:     "bg-orange-50 text-orange-700 border-orange-100",
  fractional:   "bg-teal-50 text-teal-700 border-teal-100",
  interim:      "bg-zinc-50 text-zinc-600 border-zinc-200",
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "fractional", label: "Fractional" },
  { value: "interim", label: "Interim" },
];

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function getLogoUrl(companyUrl: string | null | undefined): string | null {
  if (!companyUrl) return null;
  try {
    const hostname = new URL(
      companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`
    ).hostname.replace(/^www\./, "");
    return `https://logo.clearbit.com/${hostname}`;
  } catch {
    return null;
  }
}

function CompanyLogo({ company, companyUrl }: { company: string; companyUrl?: string | null }) {
  const logoUrl = getLogoUrl(companyUrl);
  const initials = company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (logoUrl) {
    return (
      <div className="size-12 rounded-xl border border-zinc-100 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
        <Image
          src={logoUrl}
          alt={`${company} logo`}
          width={48}
          height={48}
          className="object-contain"
          onError={(e) => {
            // Fall back to initials on error
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.textContent = initials;
              parent.className =
                "size-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm";
              parent.style.background = "linear-gradient(135deg, #6366f1, #8b5cf6)";
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="size-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm"
      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
    >
      {initials}
    </div>
  );
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
                  : "bg-white text-zinc-500 border border-zinc-200 hover:border-indigo-200 hover:text-indigo-600"
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
              : "border-zinc-200 text-zinc-500 hover:border-indigo-200 hover:text-indigo-600 bg-white"
          }`}
        >
          🌐 Remote only
        </button>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">No jobs match your filters.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => {
            const salary = formatSalary(job.salary_min, job.salary_max);
            const applyHref = job.apply_url ?? (job.apply_email ? `mailto:${job.apply_email}` : null);
            const typeColor = JOB_TYPE_COLORS[job.job_type] ?? "bg-zinc-50 text-zinc-600 border-zinc-200";

            return (
              <div
                key={job.id}
                className="group rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Company logo */}
                  <CompanyLogo company={job.company} companyUrl={(job as JobWithPoster).company_url} />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Featured badge + title */}
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {job.is_featured && (
                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-base font-bold text-zinc-900 hover:text-indigo-600 transition-colors leading-snug"
                        >
                          {job.title}
                        </Link>
                        {/* Company + location */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-700">{job.company}</span>
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                              <MapPin className="size-3" />
                              {job.location}
                            </span>
                          )}
                          {job.is_remote && (
                            <span className="text-xs text-teal-600 font-medium bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                              Remote
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Apply button — top right */}
                      {applyHref && (
                        <a
                          href={applyHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          Apply
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg border ${typeColor}`}>
                        {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                      </span>
                      {job.seniority && (
                        <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg font-medium">
                          {job.seniority}
                        </span>
                      )}
                      {salary && (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                          💰 {salary}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-50">
                      <Clock className="size-3 text-zinc-300" />
                      <span className="text-xs text-zinc-400">
                        Posted by{" "}
                        <span className="font-medium text-zinc-500">{job.profiles?.full_name ?? "Unknown"}</span>
                        {" "}· {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
