import { createAIRepository, type LeadScore } from "@/entities/ai";

const BATCH_WINDOW_MS = 30;
const BATCH_MAX = 100;

type Waiter = (score: LeadScore | null) => void;

const repo = createAIRepository();
const waiting = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const batch = new Map(waiting);
  waiting.clear();
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += BATCH_MAX) {
    const chunk = ids.slice(i, i + BATCH_MAX);
    let byId = new Map<string, LeadScore>();
    try {
      byId = new Map((await repo.scoreLeads(chunk)).map((s) => [s.leadId, s]));
    } catch {
      /* a badge without a score renders nothing */
    }
    for (const id of chunk) for (const done of batch.get(id) ?? []) done(byId.get(id) ?? null);
  }
}

/**
 * A lead's priority score. Calls made together (a board page of cards) share
 * one request instead of one request per card.
 */
export function loadLeadScore(leadId: string): Promise<LeadScore | null> {
  return new Promise((resolve) => {
    waiting.set(leadId, [...(waiting.get(leadId) ?? []), resolve]);
    timer ??= setTimeout(() => void flush(), BATCH_WINDOW_MS);
  });
}
