import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type { SearchHit, SearchResult } from "./model";

type Raw = Record<string, unknown>;

function mapHit(raw: Raw): SearchHit {
  return {
    id: String(raw.id ?? ""),
    entityType: String(raw.entity_type ?? raw.entityType ?? "customer"),
    title: String(raw.title ?? raw.name ?? ""),
    subtitle: String(raw.subtitle ?? raw.description ?? ""),
    hrefHint: String(raw.href_hint ?? raw.hrefHint ?? ""),
    score: Number(raw.score ?? 0),
  };
}

export interface SearchRepository {
  search(q: string): Promise<SearchResult>;
}

class ApiRepo implements SearchRepository {
  constructor(private readonly http: HttpClient) {}

  async search(q: string): Promise<SearchResult> {
    const data = await this.http.request<
      Raw[] | { items?: Raw[]; hits?: Raw[]; query?: string }
    >(`/search?q=${encodeURIComponent(q)}`);
    const rows = Array.isArray(data)
      ? data
      : (data.hits ?? data.items ?? []);
    return {
      query: Array.isArray(data) ? q : String(data.query ?? q),
      hits: rows.map(mapHit),
    };
  }
}

class MemoryRepo implements SearchRepository {
  async search(q: string): Promise<SearchResult> {
    const needle = q.trim().toLowerCase();
    if (!needle) return { query: q, hits: [] };
    const seed: SearchHit[] = [
      {
        id: "cust-1",
        entityType: "customer",
        title: "Ahmed Al-Rashid",
        subtitle: "Customer · +966…",
        hrefHint: "customers",
        score: 0.9,
      },
      {
        id: "lead-1",
        entityType: "lead",
        title: "Umrah family inquiry",
        subtitle: "Lead · Pipeline",
        hrefHint: "pipeline",
        score: 0.8,
      },
      {
        id: "book-1",
        entityType: "booking",
        title: "BK-1042",
        subtitle: "Booking · Confirmed",
        hrefHint: "bookings",
        score: 0.7,
      },
    ];
    return {
      query: q,
      hits: seed.filter(
        (h) =>
          h.title.toLowerCase().includes(needle) ||
          h.subtitle.toLowerCase().includes(needle) ||
          h.entityType.toLowerCase().includes(needle),
      ),
    };
  }
}

let mem: MemoryRepo | null = null;

export function createSearchRepository(): SearchRepository {
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<SearchRepository>({
    api,
    memory: mem,
    reads: ["search"],
  });
}
