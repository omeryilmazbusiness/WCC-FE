/**
 * In-memory stale-while-revalidate store for client reads: a screen opened again shows
 * its last data at once while a fresh copy loads. Bounded (LRU) and age-limited, so
 * long-idle data is never shown; lives only in the browser tab (cleared on reload).
 */
export type QueryCacheOptions = {
  maxEntries: number;
  /** Older entries are ignored (the screen loads as if uncached). */
  maxAgeMs: number;
  now?: () => number;
};

type Entry = { data: unknown; at: number };

export class QueryCache {
  private readonly entries = new Map<string, Entry>();
  private readonly options: QueryCacheOptions;
  private readonly now: () => number;

  constructor(options: QueryCacheOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }

  static keyOf(scope: string, parts: readonly unknown[]): string {
    return JSON.stringify([scope, ...parts]);
  }

  get<T>(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (this.now() - hit.at > this.options.maxAgeMs) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.data as T;
  }

  set(key: string, data: unknown): void {
    this.entries.delete(key);
    this.entries.set(key, { data, at: this.now() });
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
