import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuggestTopicForm from "./suggest-topic-form";
import { MessageSquarePlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function SuggestTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E8503A, #F07058)" }}
        >
          <MessageSquarePlus className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Suggest a Topic</h1>
          <p className="text-sm text-muted-foreground">Tell us what you&apos;d like TALK to cover</p>
        </div>
      </div>

      {submitted === "true" ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-12 text-center space-y-3">
          <CheckCircle2 className="size-12 mx-auto text-primary" />
          <p className="text-lg font-bold text-foreground">Thanks for the suggestion!</p>
          <p className="text-sm text-muted-foreground">
            We read every one of these when planning upcoming sessions and discussions.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/dashboard" className="text-sm font-semibold text-[#E8503A] hover:underline">
              ← Back to Dashboard
            </Link>
            <Link href="/topics/suggest" className="text-sm font-semibold text-muted-foreground hover:underline">
              Suggest another
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Have something you want to discuss at an upcoming event, or a subject you wish TALK
            covered more? Let us know below.
          </p>
          <SuggestTopicForm userId={user.id} />
        </div>
      )}
    </div>
  );
}
