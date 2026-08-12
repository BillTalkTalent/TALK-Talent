const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.talktalent.com";

// Wraps member-facing share text in a consistent TALK-branded footer so
// every LinkedIn post promotes the community, not just the linked content.
export function buildLinkedInShareText(body: string): string {
  return `${body}\n\n— \nShared via TALK, the private community for TA leaders.\nJoin us: ${SITE_URL}/signup\n\n#TalentAcquisition #TAleaders #TALKCommunity`;
}
