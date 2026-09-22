// Rotating weekly discussion prompts for each topic-based chapter's forum
// category. Keyed by the chapter's forum_categories.slug (not the chapters
// table's own slug — those differ, e.g. chapter "executive-leadership" vs
// forum category "chapter-executive-leadership"). These categories mostly
// sit empty right now; a standing prompt each week gives members something
// to react to instead of needing to originate a topic themselves.
export const CHAPTER_PROMPT_BANK: Record<string, string[]> = {
  "chapter-executive-leadership": [
    "What's the hardest part of closing an executive candidate right now — comp, counter-offers, or something else?",
    "How do you build a slate for a confidential exec search without tipping off the market?",
    "What's one thing you wish hiring committees understood about executive timelines?",
  ],
  "chapter-campus-early-careers": [
    "How is your campus recruiting strategy changing as internship-to-full-time conversion gets more competitive?",
    "What's actually working to get early-career candidates through a multi-stage interview process without ghosting?",
    "Are you seeing GPA and pedigree matter less than they used to? What's replacing them?",
  ],
  "chapter-sourcing-research": [
    "What's your go-to sourcing channel this quarter that isn't LinkedIn?",
    "How has AI changed your actual day-to-day sourcing workflow — for better or worse?",
    "What's a sourcing project that took way longer than expected, and what did you learn?",
  ],
  "chapter-dei-talent": [
    "How is your organization talking about DEI in hiring right now, given the current legal and political climate?",
    "What's one concrete practice that's actually widened your candidate pool, not just your intentions?",
    "How do you measure whether your hiring process is genuinely equitable, versus just compliant?",
  ],
  "chapter-tech-ai": [
    "What AI tool has actually saved you real time this month, versus just being a novelty?",
    "How are you handling AI-polished resumes and interview answers that all start to sound the same?",
    "What's one part of the hiring process you'd never hand over to AI, no matter how good it gets?",
  ],
  "chapter-employer-brand": [
    "What's one piece of employer brand content that actually drove real applicants, not just impressions?",
    "How do you keep your employer brand honest when the day-to-day reality is more complicated than the careers page?",
    "What's working for you on employee-generated content (people posting about your company on their own)?",
  ],
  "chapter-operations-analytics": [
    "What's the one recruiting metric your leadership actually cares about, versus the ones you track for yourself?",
    "How are you thinking about time-to-fill versus quality-of-hire tradeoffs this year?",
    "What's a recruiting ops process you automated that had the biggest payoff?",
  ],
  "chapter-high-volume": [
    "What's your biggest bottleneck in high-volume hiring right now — screening, scheduling, or offer stage?",
    "How are you keeping candidate experience decent at scale when everything's built for speed?",
    "What's one tool or process change that meaningfully cut your time-to-fill on high-volume roles?",
  ],
  "chapter-startup-scaleup": [
    "What's different about recruiting at a startup once you cross ~100 employees?",
    "How do you build hiring process discipline without losing the speed that got you here?",
    "What's the hardest role you've had to hire for with no in-house recruiting team yet?",
  ],
}

// Deterministic rotation — no extra table to track "which prompt did we use
// last time," just the ISO week number modulo the bank size. Same prompt
// won't repeat until the bank cycles through.
export function pickWeeklyPrompt(categorySlug: string, forDate = new Date()): string | null {
  const bank = CHAPTER_PROMPT_BANK[categorySlug]
  if (!bank || bank.length === 0) return null
  const oneJan = new Date(forDate.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((forDate.getTime() - oneJan.getTime()) / 86400000)
  const isoWeek = Math.ceil((dayOfYear + oneJan.getDay() + 1) / 7)
  return bank[isoWeek % bank.length]
}
