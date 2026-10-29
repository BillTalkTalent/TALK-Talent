import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, FileText, Video, Trash2 } from "lucide-react";
import { format } from "date-fns";
import DownloadButton from "./download-button";

async function deleteFounderFile(id: string) {
  "use server";
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("founder_files").delete().eq("id", id);
  revalidatePath("/founders/files");
}

type FileRow = {
  id: string;
  kind: "file" | "recording";
  title: string;
  description: string | null;
  url: string;
  created_at: string;
  uploaded_by: string | null;
  profiles: { full_name: string | null } | null;
};

export default async function FounderFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("founder_files")
    .select("id, kind, title, description, url, created_at, uploaded_by, profiles(full_name)")
    .order("created_at", { ascending: false });
  if (kind === "file" || kind === "recording") query = query.eq("kind", kind);

  const { data } = await query;
  const files = (data ?? []) as FileRow[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="size-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Files &amp; Recordings</h1>
            <p className="text-sm text-muted-foreground">Shared resources and meeting recordings</p>
          </div>
        </div>
        <Button className="shadow-sm" render={<Link href="/founders/files/new" />}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <div className="flex gap-2">
        {[
          { href: "/founders/files", label: "All", active: !kind },
          { href: "/founders/files?kind=file", label: "Files", active: kind === "file" },
          { href: "/founders/files?kind=recording", label: "Recordings", active: kind === "recording" },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              t.active ? "bg-zinc-900 text-white" : "bg-muted text-muted-foreground hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-16 text-center">
          <FolderOpen className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nothing here yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add a file or a recording link.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {files.map((f) => (
            <li key={f.id} className="rounded-2xl bg-card border border-border shadow-sm p-4 flex items-center gap-4">
              <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                {f.kind === "recording" ? (
                  <Video className="size-4 text-indigo-600" />
                ) : (
                  <FileText className="size-4 text-indigo-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{f.title}</p>
                {f.description && <p className="text-sm text-muted-foreground truncate">{f.description}</p>}
                <p className="text-xs text-muted-foreground">
                  by {f.profiles?.full_name ?? "Unknown"} · {format(new Date(f.created_at), "MMM d")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.kind === "recording" ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    Watch →
                  </a>
                ) : (
                  <DownloadButton path={f.url} />
                )}
                {f.uploaded_by === user?.id && (
                  <form action={deleteFounderFile.bind(null, f.id)}>
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
