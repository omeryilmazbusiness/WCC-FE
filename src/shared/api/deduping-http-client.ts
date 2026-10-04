import type { HttpClient, HttpRequestInit } from "./http-client";

export type DedupingOptions = {
  /** Successful GETs are reused for this long; bursts from remounts / sibling widgets collapse. */
  ttlMs: number;
  /** Upper bound on remembered responses (oldest evicted first). */
  maxEntries: number;
  now?: () => number;
};

/** `at` is null while the request is in flight; the TTL counts from settlement. */
type Entry = { at: number | null; value: Promise<unknown> };

const isRead = (init: HttpRequestInit) => (init.method ?? "GET") === "GET" && init.body == null;

/**
 * Decorates an `HttpClient`: identical in-flight GETs share one request however long it
 * takes, and successful results are reused for `ttlMs` after they arrive. Any mutation clears everything so reads after a write
 * are always fresh; failures are never remembered. Identical in-flight `raw()` GETs also
 * share one request, but their responses are never kept once settled (downloads can be large).
 */
export class DedupingHttpClient implements HttpClient {
  private readonly entries = new Map<string, Entry>();
  private readonly rawInFlight = new Map<string, Promise<Response>>();
  private readonly inner: HttpClient;
  private readonly options: DedupingOptions;
  private readonly now: () => number;

  constructor(inner: HttpClient, options: DedupingOptions) {
    this.inner = inner;
    this.options = options;
    this.now = options.now ?? Date.now;
  }

  request<T>(path: string, init: HttpRequestInit = {}): Promise<T> {
    if (!isRead(init) || init.signal) {
      if (!isRead(init)) this.clear();
      return this.inner.request<T>(path, init);
    }
    const key = path;
    const hit = this.entries.get(key);
    if (hit && (hit.at === null || this.now() - hit.at < this.options.ttlMs)) return hit.value as Promise<T>;

    const value = this.inner.request<T>(path, init);
    const entry: Entry = { at: null, value };
    this.remember(key, entry);
    value.then(
      () => {
        entry.at = this.now();
      },
      () => {
        if (this.entries.get(key) === entry) this.entries.delete(key);
      },
    );
    return value;
  }

  raw(path: string, init: HttpRequestInit = {}): Promise<Response> {
    if (!isRead(init) || init.signal) {
      if (!isRead(init)) this.clear();
      return this.inner.raw(path, init);
    }
    let shared = this.rawInFlight.get(path);
    if (!shared) {
      const pending = this.inner.raw(path, init);
      shared = pending;
      const release = () => {
        if (this.rawInFlight.get(path) === pending) this.rawInFlight.delete(path);
      };
      pending.then(release, release);
      this.rawInFlight.set(path, pending);
    }
    // A body can be read once, so every caller gets its own clone.
    return shared.then((res) => res.clone());
  }

  clear(): void {
    this.entries.clear();
    this.rawInFlight.clear();
  }

  private remember(key: string, entry: Entry) {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
