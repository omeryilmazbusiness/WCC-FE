import { canAccessPath } from "@/shared/config/permissions";
import { FAQ_TOPICS, type FaqTopic, type FaqTopicId } from "./catalog";

/** One question with its copy resolved for the current locale. */
export type FaqEntry = {
  topic: FaqTopicId;
  id: string;
  question: string;
  answer: string;
};

/** Topics the viewer may read: general ones always, screen topics only if the screen opens. */
export function visibleFaqTopics(granted: readonly string[], topics: readonly FaqTopic[] = FAQ_TOPICS): FaqTopic[] {
  return topics.filter((t) => !t.route || canAccessPath(granted, t.route));
}

/**
 * Folds case, Latin diacritics, Arabic diacritics/tatweel and common Arabic letter
 * variants, so "ozet", "Özet" and "أهلا"/"اهلا" match each other.
 */
export function normalizeFaqText(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

export function faqTerms(query: string): string[] {
  return normalizeFaqText(query).split(" ").filter(Boolean);
}

/**
 * Entries containing every query term, best first: matches in the question outrank
 * matches only in the answer; ties keep catalogue order. An empty query returns all.
 */
export function searchFaq(entries: readonly FaqEntry[], query: string): FaqEntry[] {
  const terms = faqTerms(query);
  if (terms.length === 0) return [...entries];
  return entries
    .map((entry, index) => {
      const q = normalizeFaqText(entry.question);
      const a = normalizeFaqText(entry.answer);
      let score = 0;
      for (const term of terms) {
        if (q.includes(term)) score += 3;
        else if (a.includes(term)) score += 1;
        else return null;
      }
      return { entry, index, score };
    })
    .filter((hit): hit is { entry: FaqEntry; index: number; score: number } => hit !== null)
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .map((hit) => hit.entry);
}

/** Stable element id / URL hash of one question, e.g. `faq-bookings-confirm`. */
export function faqAnchor(topic: string, question: string): string {
  return `faq-${topic}-${question}`;
}
