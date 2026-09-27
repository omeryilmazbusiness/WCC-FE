/**
 * Client side of the backend realtime feed (`GET /v1/stream`, Server-Sent Events).
 * Signals carry no record data — only what changed — so listeners refetch through the
 * normal scoped endpoints. Pure: fetch, timers and randomness are injected (selftested).
 */

export type RealtimeSignalType = "notification" | "invalidate";

export type RealtimeSignal = {
  type: RealtimeSignalType;
  topic: string;
  userId?: string;
  branchId?: string;
};

export type RealtimeStatus = "idle" | "connecting" | "open" | "stopped";

export type SseEvent = { event: string; data: string };

/** Incremental `text/event-stream` parser; `push` accepts arbitrary chunk boundaries. */
export function createSseParser(onEvent: (e: SseEvent) => void) {
  let buffer = "";
  let event = "";
  let data: string[] = [];

  const dispatch = () => {
    if (data.length > 0 || event) onEvent({ event: event || "message", data: data.join("\n") });
    event = "";
    data = [];
  };

  const line = (raw: string) => {
    if (raw === "") return dispatch();
    if (raw.startsWith(":")) return;
    const colon = raw.indexOf(":");
    const field = colon === -1 ? raw : raw.slice(0, colon);
    let value = colon === -1 ? "" : raw.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.search(/\r\n|\r|\n/)) !== -1) {
        const width = buffer.startsWith("\r\n", nl) ? 2 : 1;
        line(buffer.slice(0, nl));
        buffer = buffer.slice(nl + width);
      }
    },
  };
}

export function parseSignal(e: SseEvent): RealtimeSignal | null {
  if (e.event !== "notification" && e.event !== "invalidate") return null;
  try {
    const raw = JSON.parse(e.data) as Record<string, unknown>;
    if (typeof raw.topic !== "string") return null;
    return {
      type: e.event,
      topic: raw.topic,
      userId: typeof raw.user_id === "string" ? raw.user_id : undefined,
      branchId: typeof raw.branch_id === "string" ? raw.branch_id : undefined,
    };
  } catch {
    return null;
  }
}

/** `task` matches `task`, `task.overdue`, … but not `tasks`. */
export function topicMatches(topic: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => topic === p || topic.startsWith(`${p}.`));
}

export type RealtimeDeps = {
  url: string;
  fetch: typeof fetch;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  /** Runs before listeners, e.g. to drop cached reads so their refetch is fresh. */
  beforeDispatch?: (s: RealtimeSignal) => void;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

type Listener = (s: RealtimeSignal) => void;
type StatusListener = (s: RealtimeStatus) => void;

/**
 * One stream shared by every listener in the tab: opens with the first subscriber,
 * closes with the last. Reconnects with jittered backoff; `expired` (access token
 * lifetime reached) reconnects at once so the BFF can refresh the session. A 401/403
 * stops for good — the session is over and regular requests handle the redirect.
 */
export class RealtimeConnection {
  private readonly listeners = new Set<Listener>();
  private readonly statusListeners = new Set<StatusListener>();
  private controller: AbortController | null = null;
  private current: RealtimeStatus = "idle";
  private readonly deps: RealtimeDeps;

  constructor(deps: RealtimeDeps) {
    this.deps = deps;
  }

  get status(): RealtimeStatus {
    return this.current;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.controller && this.current !== "stopped") this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop("idle");
    };
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Allows a new start after a terminal stop (e.g. after signing in again). */
  reset() {
    this.stop("idle");
    if (this.listeners.size > 0) this.start();
  }

  private setStatus(next: RealtimeStatus) {
    if (next === this.current) return;
    this.current = next;
    for (const l of this.statusListeners) l(next);
  }

  private start() {
    const controller = new AbortController();
    this.controller = controller;
    void this.loop(controller.signal);
  }

  private stop(status: RealtimeStatus) {
    this.controller?.abort();
    this.controller = null;
    this.setStatus(status);
  }

  private async loop(signal: AbortSignal) {
    const base = this.deps.baseDelayMs ?? 1_000;
    const max = this.deps.maxDelayMs ?? 30_000;
    const random = this.deps.random ?? Math.random;
    let failures = 0;
    while (!signal.aborted) {
      this.setStatus("connecting");
      const outcome = await this.once(signal);
      if (signal.aborted) return;
      if (outcome === "fatal") {
        this.controller = null;
        this.setStatus("stopped");
        return;
      }
      if (outcome === "opened" || outcome === "expired") failures = 0;
      else failures++;
      this.setStatus("connecting");
      if (outcome === "expired") continue;
      const ceiling = Math.min(max, base * 2 ** Math.min(failures, 10));
      const delay = outcome === "opened" ? base : Math.round(ceiling / 2 + (random() * ceiling) / 2);
      await this.deps.sleep(delay, signal).catch(() => undefined);
    }
  }

  private async once(signal: AbortSignal): Promise<"opened" | "expired" | "failed" | "fatal"> {
    let res: Response;
    try {
      res = await this.deps.fetch(this.deps.url, {
        headers: { Accept: "text/event-stream" },
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
    } catch {
      return "failed";
    }
    if (res.status === 401 || res.status === 403) return "fatal";
    if (!res.ok || !res.body) return "failed";

    let opened = false;
    let expired = false;
    const parser = createSseParser((e) => {
      if (e.event === "ready") {
        opened = true;
        this.setStatus("open");
        return;
      }
      if (e.event === "expired") {
        expired = true;
        return;
      }
      const s = parseSignal(e);
      if (!s) return;
      this.deps.beforeDispatch?.(s);
      for (const l of [...this.listeners]) {
        try {
          l(s);
        } catch {
          // one broken listener must not starve the others
        }
      }
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
        if (expired) break;
      }
    } catch {
      // network drop or abort; handled by the caller
    } finally {
      reader.cancel().catch(() => undefined);
    }
    if (expired) return "expired";
    return opened ? "opened" : "failed";
  }
}
