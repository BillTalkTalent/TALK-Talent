import LegalShell, { H2, P, LI } from "@/components/legal-shell";

export const metadata = { title: "Terms of Service — TALK Talent Community" };

// NOTE: Standard boilerplate for a professional community platform. Review before
// launch and fill the bracketed items ([COMPANY LEGAL NAME], [GOVERNING LAW]) —
// ideally with a legal read.
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effective="July 15, 2026">
      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the TALK Talent Community
        platform (the &ldquo;Service&rdquo;), operated by <strong>[COMPANY LEGAL NAME]</strong>
        (&ldquo;TALK,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By accessing or using the Service, you
        agree to these Terms. If you do not agree, do not use the Service.
      </P>

      <H2>Eligibility &amp; membership</H2>
      <P>
        TALK is a private community for talent-acquisition professionals. You must be at least 16 and
        provide accurate information. Membership is offered at our discretion and is free for the TA
        community.
      </P>

      <H2>Your account</H2>
      <P>
        You are responsible for keeping your login credentials secure and for all activity under your
        account. Notify us promptly of any unauthorized use.
      </P>

      <H2>Community guidelines</H2>
      <P>You agree to keep TALK a professional, respectful space. You will not:</P>
      <ul className="list-disc pl-5 space-y-1">
        <LI>Post unlawful, harassing, hateful, deceptive, or infringing content.</LI>
        <LI>Spam, solicit, or scrape members or their data.</LI>
        <LI>Impersonate others or misrepresent your affiliation.</LI>
        <LI>Disrupt, probe, or attempt to gain unauthorized access to the Service.</LI>
      </ul>

      <H2>Your content</H2>
      <P>
        You retain ownership of the content you post. You grant TALK a non-exclusive, worldwide,
        royalty-free license to host, display, and distribute your content within the Service to
        operate and promote the community. You are responsible for the content you share.
      </P>

      <H2>Moderation &amp; termination</H2>
      <P>
        We may remove content, and suspend or terminate accounts, that violate these Terms or harm the
        community. You may stop using the Service and request account deletion at any time.
      </P>

      <H2>Intellectual property</H2>
      <P>
        The Service, including its design, features, and TALK branding, is owned by TALK and protected
        by applicable laws. These Terms grant you no rights to our trademarks or software beyond using
        the Service as intended.
      </P>

      <H2>Disclaimers</H2>
      <P>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties
        of any kind. Content posted by members reflects their own views, not TALK&rsquo;s. We do not
        guarantee the accuracy of job posts, vendor reviews, or member-provided information.
      </P>

      <H2>Limitation of liability</H2>
      <P>
        To the fullest extent permitted by law, TALK will not be liable for any indirect, incidental,
        or consequential damages arising from your use of the Service.
      </P>

      <H2>Governing law</H2>
      <P>
        These Terms are governed by the laws of <strong>[GOVERNING LAW — STATE / COUNTRY]</strong>,
        without regard to conflict-of-laws principles.
      </P>

      <H2>Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. Material changes will be communicated through the
        Service or by email, and continued use after changes take effect constitutes acceptance.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about these Terms? Email <strong>support@talktalent.com</strong>.
      </P>
    </LegalShell>
  );
}
