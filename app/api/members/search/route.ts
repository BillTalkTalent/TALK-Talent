import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Powers the @mention typeahead (components/mention-textarea.tsx) — search
// as you type, approved members only. Authenticated (any signed-in member
// can search; RLS-equivalent status/is_bot filtering happens here since
// this uses the caller's own session, not the service-role client).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ members: [] });

  const safe = q.replace(/[%_]/g, "\\$&");
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, title, company")
    .eq("status", "approved")
    .eq("is_bot", false)
    .not("full_name", "is", null)
    .ilike("full_name", `%${safe}%`)
    .order("full_name", { ascending: true })
    .limit(8);

  return NextResponse.json({ members: data ?? [] });
}
