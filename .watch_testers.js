// Watches the 28 testers for the FIRST genuine sign-in after the latest resend.
// With deferred-verify, last_sign_in_at only updates on password submit, so a
// timestamp newer than the threshold = a real person actually got into the system.
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const emails = fs.readFileSync("/tmp/testers.txt", "utf8").split("\n").map(x => x.trim().toLowerCase()).filter(Boolean);
const THRESHOLD = Date.now();             // resend just happened; watch for entries after now
const INTERVAL_MS = 180000;               // poll every 3 minutes
const MAX_CHECKS = 80;                     // ~4 hours
let checks = 0;

async function poll() {
  checks++;
  try {
    const { data: list } = await s.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byEmail = new Map(list.users.map(u => [(u.email || "").toLowerCase(), u]));
    const got = [];
    for (const e of emails) {
      const u = byEmail.get(e);
      if (u && u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > THRESHOLD) {
        got.push({ e, at: u.last_sign_in_at });
      }
    }
    const stamp = new Date().toISOString();
    if (got.length > 0) {
      console.log(`\n=== FIRST GENUINE COMPLETION(S) at check ${checks} (${stamp}) ===`);
      for (const g of got) console.log(`  GOT IN: ${g.e}  at ${g.at}`);
      process.exit(0);
    }
    console.log(`check ${checks}/${MAX_CHECKS} (${stamp}): still 0 of ${emails.length} in since resend`);
    if (checks >= MAX_CHECKS) {
      console.log("=== TIMEOUT: no genuine completions after ~4h ===");
      process.exit(0);
    }
  } catch (err) {
    console.log(`check ${checks}: error ${err.message}`);
    if (checks >= MAX_CHECKS) process.exit(0);
  }
}

poll();
setInterval(poll, INTERVAL_MS);
