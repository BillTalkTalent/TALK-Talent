import LegalShell from "@/components/legal-shell";
import { TERMS_TEXT } from "@/lib/legal/terms-text";

export const metadata = { title: "Terms of Service — TALK Talent Community" };

export default function TermsPage() {
  return (
    <LegalShell>
      <div className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed">
        {TERMS_TEXT}
      </div>
    </LegalShell>
  );
}
