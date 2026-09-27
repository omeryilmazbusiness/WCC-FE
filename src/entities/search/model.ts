/** Kinds the backend search can be filtered by, in display order. */
export const SEARCH_KINDS = ["customer", "lead", "booking", "passport"] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchEntityType = SearchKind | string;

export type SearchHit = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  hrefHint: string;
  score: number;
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
};

export type SearchOptions = {
  /** Empty or missing searches every kind. */
  kinds?: readonly SearchKind[];
  limit?: number;
};

export function isSearchKind(value: string): value is SearchKind {
  return (SEARCH_KINDS as readonly string[]).includes(value);
}

/** Query string for GET /search; the backend rejects unknown kinds. */
export function searchQueryString(q: string, options: SearchOptions = {}): string {
  const params = new URLSearchParams({ q: q.trim() });
  if (options.kinds?.length) params.set("kind", options.kinds.join(","));
  if (options.limit) params.set("limit", String(options.limit));
  return params.toString();
}
