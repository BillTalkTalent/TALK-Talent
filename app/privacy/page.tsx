import LegalShell from "@/components/legal-shell";
import { PRIVACY_TEXT } from "@/lib/legal/privacy-text";

export const metadata = { title: "Privacy Policy — TALK Talent Community" };

export default function PrivacyPage() {
  return (
    <LegalShell>
      <div className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed">
        {PRIVACY_TEXT}
      </div>
    </LegalShell>
  );
}
