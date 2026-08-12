// Short brand line appended to share text — the branded image (see
// lib/share-card.tsx) carries the heavy promotion now, so this stays
// light enough that members won't feel the urge to delete it.
export function buildLinkedInShareText(body: string): string {
  return `${body}\n\nShared via TALK — the private community for TA leaders. #TalentAcquisition #TALKCommunity`;
}
