#!/usr/bin/env python3
"""Parse the TALK member export into clean JSON for provisioning.
Filters: skip disabled, bounced (email_reported_failed), bad emails; dedup by user_email.
Sorted by engagement (sign_in_count desc, last_sign_in_at desc) so the front of the
list is the Wave 1 cohort. Writes /tmp/members_clean.json. Reads/writes nothing else."""
import csv, json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/billtextio/Desktop/TALK Members - July 14.csv"
OUT = "/tmp/members_clean.json"
emailre = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def clean(v): return (v or "").strip()

rows = disabled = bounced = bademail = dups = 0
seen = set()
out = []
with open(SRC, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        rows += 1
        email = clean(row.get("user_email")).lower()
        if not emailre.match(email): bademail += 1; continue
        if clean(row.get("email_reported_failed")).upper() == "TRUE": bounced += 1; continue
        if clean(row.get("user_disabled_at")): disabled += 1; continue
        if email in seen: dups += 1; continue
        seen.add(email)
        board = clean(row.get("Board?"))
        is_admin = clean(row.get("admin")).upper() == "TRUE"
        role = "admin" if is_admin else ("board_member" if board == "board_member" else "member")
        try: sic = int(float(row.get("sign_in_count") or 0))
        except Exception: sic = 0
        out.append({
            "email": email,
            "prof_email": clean(row.get("Professional Email")).lower(),
            "personal_email": clean(row.get("Personal Email")).lower(),
            "full_name": (clean(row.get("first_name")) + " " + clean(row.get("last_name"))).strip() or None,
            "title": clean(row.get("job_title")) or None,
            "company": clean(row.get("company_name")) or None,
            "linkedin_url": clean(row.get("linkedin_url")) or None,
            "chapter": clean(row.get("TALK Chapter")) or None,
            "role": role,
            "sign_in_count": sic,
            "last_sign_in_at": clean(row.get("last_sign_in_at")),
        })

# engagement-first ordering (Wave 1 = front of list)
out.sort(key=lambda p: (p["sign_in_count"], p["last_sign_in_at"]), reverse=True)
json.dump(out, open(OUT, "w"))
print(json.dumps({
    "total_rows": rows, "skip_disabled": disabled, "skip_bounced": bounced,
    "skip_bad_email": bademail, "skip_dup": dups, "provisionable": len(out),
    "written": OUT,
}))
