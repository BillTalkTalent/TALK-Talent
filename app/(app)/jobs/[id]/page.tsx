import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MapPin, ExternalLink, Mail, Clock, Pencil } from "lucide-react";

const JOB_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  fractional: "Fractional",
  interim: "Interim",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  "full-time": "bg-blue-50 text-blue-700 border-blue-100",
  "part-time": "bg-purple-50 text-purple-700 border-purple-100",
  contract:    "bg-orange-50 text-orange-700 border-orange-100",
  fractional:  "bg-teal-50 text-teal-700 border-teal-100",
  interim:     "bg-zinc-50 text-zinc-600 border-zinc-200",
};

function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${currency}`;
  if (min) return `${fmt(min)}+ ${currency}`;
  if (max) return `Up to ${fmt(max)} ${currency}`;
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

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("job_posts")
    .select("*, profiles(id, full_name, company, title)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const applyHref = job.apply_url ?? (job.apply_email ? `mailto:${job.apply_email}` : null);
  const poster = job.profiles as { id: string; full_name: string | null; company: string | null; title: string | null } | null;
  const isAuthor = user?.id === job.poster_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyUrl = (job as any).company_url as string | null | undefined;
  const logoUrl = getLogoUrl(companyUrl);
  const initials = job.company.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
  const typeColor = JOB_TYPE_COLORS[job.job_type] ?? "bg-zinc-50 text-zinc-600 border-zinc-200";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Job Board
      </Link>

      {/* Header card */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-4">
          {/* Company logo */}
          <div className="shrink-0">
            {logoUrl ? (
              <div className="size-16 rounded-2xl border border-zinc-100 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <Image
                  src={logoUrl}
                  alt={`${job.company} logo`}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="size-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Title + company */}
          <div className="flex-1 min-w-0">
            {job.is_featured && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mb-2">
                ⭐ Featured
              </span>
            )}
            <h1 className="text-2xl font-bold text-zinc-900 leading-snug">{job.title}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="font-semibold text-zinc-700">{job.company}</span>
              {job.location && (
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <MapPin className="size-3.5" />
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
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <span className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="size-3" />
            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Apply / Edit buttons */}
        <div className="pt-1 flex items-center gap-3">
        {isAuthor && (
          <Link href={`/jobs/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            <Pencil className="size-3.5" /> Edit listing
          </Link>
        )}
        {applyHref && (
          <div>
            <a
              href={applyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {job.apply_url ? (
                <><ExternalLink className="size-4" /> Apply Now</>
              ) : (
                <><Mail className="size-4" /> Apply via Email</>
              )}
            </a>
          </div>
        )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-6 space-y-3">
        <h2 className="text-base font-bold text-zinc-900">About the Role</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
          {job.description}
        </p>
      </div>

      {/* Posted by */}
      {poster && (
        <Card className="rounded-2xl border-zinc-100 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">
              Posted by
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-zinc-900">{poster.full_name ?? "Community Member"}</p>
                {(poster.title || poster.company) && (
                  <p className="text-sm text-zinc-500">
                    {[poster.title, poster.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <Link
                href={`/members/${poster.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View Profile →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
