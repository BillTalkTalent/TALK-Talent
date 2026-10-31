import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyFoundersReply } from "@/lib/founders-notify";

const KIND_LABEL: Record<string, string> = {
  suggestion: "idea",
  discussion: "post",
  opportunity: "volunteer opportunity",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId, kind, contextTitle, contentPreview, link } = await req.json();
  if (!recipientId || typeof contextTitle !== "string" || typeof link !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any).from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const actorName = profile?.full_name ?? "Someone";
  const label = KIND_LABEL[kind] ?? "post";

  await notifyFoundersReply({
    recipientId,
    actorId: user.id,
    type: "founders_comment",
    title: `${actorName} commented on your ${label}: "${contextTitle}"`,
    body: typeof contentPreview === "string" ? contentPreview : "",
    relativeLink: link,
  });

  return NextResponse.json({ ok: true });
}
