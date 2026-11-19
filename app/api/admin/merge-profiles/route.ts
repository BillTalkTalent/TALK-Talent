import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/admin-auth";

// Backs the /admin/duplicate-profiles tool. Deliberately a plain API route
// rather than a 'use server' function passed as a client-component prop —
// passing an inline server action through the client boundary and binding
// it in a <form action={...}> broke the Turbopack build on this Next
// 16.2.4 setup (see the admin/chapters rebuild). A fetch() call sidesteps
// that entirely.
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Only the super admin can merge profiles" }, { status: 403 });
  }

  const { keepId, removeId } = await req.json();
  if (!keepId || !removeId || typeof keepId !== "string" || typeof removeId !== "string") {
    return NextResponse.json({ error: "keepId and removeId are required" }, { status: 400 });
  }
  if (keepId === removeId) {
    return NextResponse.json({ error: "keepId and removeId must be different profiles" }, { status: 400 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: touched, error: mergeError } = await (admin as any).rpc("merge_profiles", {
    keep_id: keepId,
    remove_id: removeId,
  });

  if (mergeError) {
    return NextResponse.json({ error: mergeError.message }, { status: 500 });
  }

  // The SQL function only reassigns public-schema rows — deleting the
  // losing account's own auth identity (and anything FK'd straight to
  // auth.users, e.g. vendor_accounts.id) is the service-role auth admin
  // API's job, which a Postgres function can't reach.
  const { error: deleteError } = await admin.auth.admin.deleteUser(removeId);
  if (deleteError) {
    return NextResponse.json({
      error: `Data merged, but couldn't delete the old account: ${deleteError.message}`,
      touched,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, touched });
}
