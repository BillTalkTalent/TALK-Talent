import LegalShell, { H2, P, LI } from "@/components/legal-shell";

export const metadata = { title: "Privacy Policy — TALK Talent Community" };

// NOTE: Standard boilerplate for a professional community platform. Review before
// launch and fill the bracketed items ([COMPANY LEGAL NAME], [MAILING ADDRESS],
// [GOVERNING LAW]) — ideally with a legal read.
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effective="July 15, 2026">
      <P>
        This Privacy Policy explains how <strong>[COMPANY LEGAL NAME]</strong> (&ldquo;TALK,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects, uses, and protects your information when you use
        the TALK Talent Community platform (the &ldquo;Service&rdquo;). By using the Service, you agree
        to this Policy.
      </P>

      <H2>Information we collect</H2>
      <ul className="list-disc pl-5 space-y-1">
        <LI><strong>Account &amp; profile:</strong> name, email, job title, company, LinkedIn, photo, bio, and chapter.</LI>
        <LI><strong>Content you create:</strong> forum posts, replies, messages, event RSVPs, poll votes, and vendor reviews.</LI>
        <LI><strong>Usage data:</strong> pages viewed, features used, device and browser information, and approximate location, collected via analytics.</LI>
        <LI><strong>Communications:</strong> emails we send you and your responses.</LI>
      </ul>

      <H2>How we use your information</H2>
      <ul className="list-disc pl-5 space-y-1">
        <LI>Operate the community — authenticate you, display your profile, and deliver forums, events, jobs, and messaging.</LI>
        <LI>Send transactional and community emails (you can manage preferences at any time).</LI>
        <LI>Maintain security, prevent abuse, and improve the Service.</LI>
      </ul>

      <H2>How we share information</H2>
      <P>
        We <strong>do not sell</strong> your personal information. We share it only: (a) with other
        members, to the extent your profile and posts are visible within the community; (b) with
        service providers who help us run the platform (hosting, email delivery, analytics) under
        confidentiality obligations; and (c) where required by law or to protect rights and safety.
      </P>

      <H2>Cookies &amp; analytics</H2>
      <P>
        We use essential cookies to keep you signed in and privacy-respecting analytics to understand
        how the Service is used. You can control cookies through your browser settings.
      </P>

      <H2>Data retention</H2>
      <P>
        We retain your information for as long as your account is active and as needed to provide the
        Service, comply with legal obligations, resolve disputes, and enforce agreements.
      </P>

      <H2>Your rights</H2>
      <P>
        Depending on where you live (including under GDPR and CCPA), you may have the right to access,
        correct, export, or delete your personal information, and to object to certain processing. To
        exercise these rights, contact us at <strong>privacy@talktalent.com</strong>.
      </P>

      <H2>Security</H2>
      <P>
        We use industry-standard safeguards to protect your information. No method of transmission or
        storage is 100% secure, but we work to protect your data and promptly address issues.
      </P>

      <H2>Children</H2>
      <P>
        The Service is intended for talent-acquisition professionals and is not directed to
        individuals under 16. We do not knowingly collect information from children.
      </P>

      <H2>Changes to this Policy</H2>
      <P>
        We may update this Policy from time to time. Material changes will be communicated through the
        Service or by email, and the &ldquo;Last updated&rdquo; date above will change.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this Policy? Email <strong>privacy@talktalent.com</strong> or write to us at
        <strong> [COMPANY LEGAL NAME], [MAILING ADDRESS]</strong>.
      </P>
    </LegalShell>
  );
}
