import type { HttpClient } from "@/shared/api/http-client";
import {
  SUPPORT_STATUSES,
  isSupportStatus,
  normalizeDraft,
  type InboundRequest,
  type SupportDraft,
  type SupportInbox,
  type SupportRequest,
  type SupportStatus,
} from "./model";

type Raw = Record<string, unknown>;

export const SUPPORT_ENDPOINTS = {
  requests: "/support/requests",
  mine: "/support/requests/mine",
  inbox: "/platform/support/requests",
} as const;

const str = (v: unknown) => (v == null ? "" : String(v));

export function parseSupportRequest(raw: unknown): SupportRequest {
  const r = (raw ?? {}) as Raw;
  return {
    id: str(r.id),
    number: Number(r.number) || 0,
    title: str(r.title),
    description: str(r.description),
    status: isSupportStatus(r.status) ? r.status : "open",
    page: str(r.page),
    adminNote: str(r.admin_note),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    resolvedAt: r.resolved_at ? str(r.resolved_at) : null,
  };
}

export function parseInbound(raw: unknown): InboundRequest {
  const r = (raw ?? {}) as Raw;
  const who = (r.requester ?? {}) as Raw;
  return {
    ...parseSupportRequest(r),
    requester: { name: str(who.name), email: str(who.email), role: str(who.role) },
    company: str(r.company),
    branch: str(r.branch),
    locale: r.locale === "ar" ? "ar" : "en",
  };
}

export function parseInbox(raw: unknown): SupportInbox {
  const r = (raw ?? {}) as Raw;
  const counts = (r.counts ?? {}) as Raw;
  return {
    items: Array.isArray(r.items) ? r.items.map(parseInbound) : [],
    total: Number(r.total) || 0,
    counts: Object.fromEntries(SUPPORT_STATUSES.map((s) => [s, Number(counts[s]) || 0])) as Record<SupportStatus, number>,
  };
}

export type InboxQuery = { status?: SupportStatus; q?: string; limit?: number; offset?: number };

export function inboxPath(q: InboxQuery): string {
  const params = new URLSearchParams();
  if (q.status) params.set("status", q.status);
  if (q.q?.trim()) params.set("q", q.q.trim());
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  const qs = params.toString();
  return qs ? `${SUPPORT_ENDPOINTS.inbox}?${qs}` : SUPPORT_ENDPOINTS.inbox;
}

/** Support API over any HTTP client, so it is testable without the browser client. */
export function createSupportApi(client: HttpClient) {
  return {
    async submit(draft: SupportDraft, locale: "en" | "ar"): Promise<SupportRequest> {
      const body = { ...normalizeDraft(draft), context: { locale } };
      return parseSupportRequest(await client.request(SUPPORT_ENDPOINTS.requests, { method: "POST", body: JSON.stringify(body) }));
    },
    async mine(): Promise<SupportRequest[]> {
      const raw = await client.request<unknown>(SUPPORT_ENDPOINTS.mine);
      return Array.isArray(raw) ? raw.map(parseSupportRequest) : [];
    },
    async inbox(q: InboxQuery = {}): Promise<SupportInbox> {
      return parseInbox(await client.request(inboxPath(q)));
    },
    async update(id: string, status: SupportStatus, note?: string): Promise<SupportRequest> {
      const body: Record<string, string> = { status };
      if (note !== undefined) body.note = note.trim();
      return parseSupportRequest(
        await client.request(`${SUPPORT_ENDPOINTS.inbox}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
      );
    },
  };
}

export type SupportApi = ReturnType<typeof createSupportApi>;
