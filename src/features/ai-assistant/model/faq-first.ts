import { revealPieces, type AssistantChunk, type AssistantTransport } from "@/entities/assistant";
import { normalizeFaqText, type FaqEntry } from "@/entities/faq";

/**
 * Help & FAQ answers "how / where / what is" questions about the app instantly and for
 * free; only questions it cannot answer (or about the viewer's own numbers) reach the assistant.
 */

const HELP_CUES = [
  "how", "where", "what is", "what are", "what does", "what do", "can i", "why", "which", "when do", "explain", "meaning",
  "كيف", "أين", "اين", "ما هو", "ما هي", "ماذا", "لماذا", "هل يمكن", "متى", "اشرح", "معنى",
  "nasıl", "nerede", "nedir", "neden", "ne işe", "hangi",
];

/** Asking about the viewer's live numbers is not a help question. */
const DATA_CUES = [
  "today", "this week", "this month", "right now", "how many", "how much",
  "اليوم", "هذا الأسبوع", "هذا الشهر", "كم",
  "bugün", "bu hafta", "bu ay", "kaç",
];

/** Requests that start with these ask for work (a summary, a draft), not for help. */
const TASK_STARTS = ["summary", "summarize", "draft", "write", "compose", "give me", "show me", "list", "ملخص", "لخص", "اكتب", "أعطني", "اعرض", "özet", "yaz", "göster"];

/** Normalized words without punctuation, so "booking?" and "booking" are the same word. */
function words(text: string): string[] {
  return normalizeFaqText(text).replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);
}

/** Words that carry no topic on their own; matching on them would give false hits. */
const STOP = new Set(
  (
    "a an the is are was be do does did can could should i we you it this that to of in on for with and or my our your " +
    "how where what which why when who me us please there here get find see use about from by at as not " +
    "في من على إلى الى عن ما ماذا كيف أين اين هل هو هي أنا انا نحن هذا هذه ذلك التي الذي مع أو او " +
    "bir ve ile için bu şu ne mi mı nasıl nerede nedir"
  )
    .split(" ")
    .flatMap(words),
);

const phrase = (c: string) => ` ${words(c).join(" ")} `;
const HELP = HELP_CUES.map(phrase);
const DATA = DATA_CUES.map(phrase);
const TASKS = TASK_STARTS.map(phrase);

export function isHelpQuestion(question: string): boolean {
  const q = ` ${words(question).join(" ")} `;
  if (DATA.some((c) => q.includes(c)) || TASKS.some((c) => q.startsWith(c))) return false;
  return HELP.some((c) => q.includes(c)) || /[?؟]\s*$/.test(question);
}

function contentTerms(question: string): string[] {
  return [...new Set(words(question).filter((t) => t.length > 1 && !STOP.has(t)))];
}

/** Light stemming: "bookings" matches "booking", "approve" matches "approval". */
function hits(term: string, words: readonly string[]): boolean {
  const stem = term.length > 5 ? term.slice(0, term.length - 2) : term;
  return words.some((w) => w === term || (w.length >= 4 && (w.startsWith(stem) || term.startsWith(w))));
}

export const FAQ_MIN_COVERAGE = 0.6;

/**
 * Best FAQ entry for a help question, or null when no entry is clearly about it.
 * Its question must cover most of the asked topic words; on a tie the more specific question wins.
 */
export type FaqLookup = (question: string) => FaqEntry | null;

type IndexedEntry = { entry: FaqEntry; question: string[]; answer: string[]; ownTerms: number };

/** Tokenizes the catalogue once; the returned lookup only scans prepared words. */
export function createFaqIndex(entries: readonly FaqEntry[]): FaqLookup {
  const index: IndexedEntry[] = entries.map((entry) => ({
    entry,
    question: words(entry.question),
    answer: words(entry.answer),
    ownTerms: contentTerms(entry.question).length || 1,
  }));
  return (question) => {
    if (!isHelpQuestion(question)) return null;
    const terms = contentTerms(question);
    if (terms.length === 0) return null;
    let best: { entry: FaqEntry; score: number } | null = null;
    for (const e of index) {
      const inQuestion = terms.filter((t) => hits(t, e.question)).length;
      if (inQuestion === 0 || inQuestion / terms.length < FAQ_MIN_COVERAGE / 2) continue;
      const coverage = terms.filter((t) => hits(t, e.question) || hits(t, e.answer)).length / terms.length;
      if (coverage < FAQ_MIN_COVERAGE) continue;
      const score = inQuestion * 3 + coverage + inQuestion / e.ownTerms;
      if (!best || score > best.score) best = { entry: e.entry, score };
    }
    return best?.entry ?? null;
  };
}

export function matchFaq(question: string, entries: readonly FaqEntry[]): FaqEntry | null {
  return createFaqIndex(entries)(question);
}

export function faqReply(entry: FaqEntry): string {
  return `**${entry.question}**\n\n${entry.answer}`;
}

/**
 * Decorates any transport with Help & FAQ first. A hit answers at once, without a
 * network call or tokens; `options.skipFaq` (Regenerate / "Ask AI instead") bypasses it.
 */
export function withFaqFirst(inner: AssistantTransport, lookup: FaqLookup): AssistantTransport {
  return {
    mode: inner.mode,
    stream(request, signal) {
      const last = [...request.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const entry = request.options?.skipFaq ? null : lookup(last);
      if (!entry) return inner.stream(request, signal);
      return (async function* (): AsyncIterable<AssistantChunk> {
        yield { type: "meta", meta: { source: "faq", capability: "app_help", faq: { topic: entry.topic, id: entry.id } } };
        for (const piece of revealPieces(faqReply(entry))) {
          if (signal.aborted) throw signal.reason;
          yield { type: "delta", text: piece };
        }
        yield { type: "done" };
      })();
    },
  };
}
