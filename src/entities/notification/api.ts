import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type {
  AppNotification,
  EscalationRule,
  NotificationGroup,
  NotificationListParams,
  NotificationPreference,
  NotificationSeverity,
  NotificationStatus,
} from "./model";

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapNotification(raw: Raw): AppNotification {
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    recipientUserId: str(raw.recipient_user_id ?? raw.recipientUserId),
    kind: str(raw.kind),
    severity: str(raw.severity ?? "info") as NotificationSeverity,
    title: str(raw.title),
    body: str(raw.body),
    entityType: str(raw.entity_type ?? raw.entityType),
    entityId: (raw.entity_id ?? raw.entityId ?? null) as string | null,
    groupKey: str(raw.group_key ?? raw.groupKey),
    occurrenceCount: Number(raw.occurrence_count ?? raw.occurrenceCount ?? 1),
    status: str(raw.status ?? "open") as NotificationStatus,
    hrefHint: str(raw.href_hint ?? raw.hrefHint),
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
    acknowledgedAt: (raw.acknowledged_at ??
      raw.acknowledgedAt ??
      null) as string | null,
    resolvedAt: (raw.resolved_at ?? raw.resolvedAt ?? null) as string | null,
  };
}

function mapGroup(raw: Raw): NotificationGroup {
  return {
    kind: str(raw.kind),
    severity: str(raw.severity ?? "info") as NotificationSeverity,
    title: str(raw.title),
    href: str(raw.href),
    open: Number(raw.open ?? 0),
    acknowledged: Number(raw.acknowledged ?? 0),
    occurrences: Number(raw.occurrences ?? 0),
    latestAt: str(raw.latest_at),
  };
}

export function notificationListQuery(params: NotificationListParams = {}): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.includeResolved) sp.set("include_resolved", "true");
  if (params.kinds?.length) sp.set("kind", params.kinds.join(","));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function mapPrefs(raw: Raw): NotificationPreference {
  return {
    userId: str(raw.user_id ?? raw.userId),
    emailEnabled: Boolean(raw.email_enabled ?? raw.emailEnabled),
    pushEnabled: Boolean(raw.push_enabled ?? raw.pushEnabled),
    inAppMandatory: Boolean(raw.in_app_mandatory ?? raw.inAppMandatory ?? true),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

function mapRule(raw: Raw): EscalationRule {
  return {
    kind: str(raw.kind),
    severity: str(raw.severity ?? "info") as NotificationSeverity,
    escalateAfterSeconds: Number(
      raw.escalate_after_seconds ?? raw.escalateAfterSeconds ?? 0,
    ),
    escalateToRoles: Array.isArray(raw.escalate_to_roles)
      ? (raw.escalate_to_roles as string[])
      : Array.isArray(raw.escalateToRoles)
        ? (raw.escalateToRoles as string[])
        : [],
    groupable: Boolean(raw.groupable),
    defaultTitle: str(raw.default_title ?? raw.defaultTitle),
    defaultHref: str(raw.default_href ?? raw.defaultHref),
    entityType: str(raw.entity_type ?? raw.entityType),
  };
}

export type NotificationRepository = {
  list(
    params?: NotificationListParams,
  ): Promise<{ items: AppNotification[]; total: number }>;
  summary(): Promise<NotificationGroup[]>;
  unreadCount(): Promise<number>;
  acknowledge(id: string): Promise<AppNotification>;
  resolve(id: string): Promise<AppNotification>;
  acknowledgeAll(): Promise<number>;
  getPreferences(): Promise<NotificationPreference>;
  updatePreferences(input: {
    emailEnabled: boolean;
    pushEnabled: boolean;
  }): Promise<NotificationPreference>;
  listRules(): Promise<EscalationRule[]>;
};

class ApiRepo implements NotificationRepository {
  constructor(private http: HttpClient) {}

  async list(params?: NotificationListParams) {
    const res = await this.http.raw(`/notifications${notificationListQuery(params)}`);
    const payload = (await res.json().catch(() => ({}))) as {
      data?: Raw[];
      meta?: { total?: number };
    };
    const list = Array.isArray(payload.data) ? payload.data : [];
    return {
      items: list.map(mapNotification),
      total: Number(payload.meta?.total ?? list.length),
    };
  }

  async summary() {
    const rows = await this.http.request<Raw[]>("/notifications/summary");
    return (Array.isArray(rows) ? rows : []).map(mapGroup);
  }

  async unreadCount() {
    const raw = await this.http.request<Raw>("/notifications/unread-count");
    return Number(raw.count ?? 0);
  }

  async acknowledge(id: string) {
    const raw = await this.http.request<Raw>(
      `/notifications/${id}/acknowledge`,
      { method: "POST" },
    );
    return mapNotification(raw);
  }

  async resolve(id: string) {
    const raw = await this.http.request<Raw>(`/notifications/${id}/resolve`, {
      method: "POST",
    });
    return mapNotification(raw);
  }

  async acknowledgeAll() {
    const raw = await this.http.request<Raw>("/notifications/ack-all", {
      method: "POST",
    });
    return Number(raw.acknowledged ?? 0);
  }

  async getPreferences() {
    const raw = await this.http.request<Raw>("/notifications/preferences");
    return mapPrefs(raw);
  }

  async updatePreferences(input: {
    emailEnabled: boolean;
    pushEnabled: boolean;
  }) {
    const raw = await this.http.request<Raw>("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify({
        email_enabled: input.emailEnabled,
        push_enabled: input.pushEnabled,
      }),
    });
    return mapPrefs(raw);
  }

  async listRules() {
    const rows = await this.http.request<Raw[]>("/notifications/rules");
    return (Array.isArray(rows) ? rows : []).map(mapRule);
  }
}

class MemoryRepo implements NotificationRepository {
  private items: AppNotification[] = [
    {
      id: "n1",
      branchId: "b1",
      recipientUserId: "u1",
      kind: "lead.no_follow_up",
      severity: "warning",
      title: "3 leads without follow-up",
      body: "Pipeline needs a call before EOD.",
      entityType: "lead",
      entityId: null,
      groupKey: "lead.no_follow_up:branch:b1",
      occurrenceCount: 3,
      status: "open",
      hrefHint: "/pipeline",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
    },
    {
      id: "n2",
      branchId: "b1",
      recipientUserId: "u1",
      kind: "document.missing",
      severity: "critical",
      title: "Missing document",
      body: "Passport copy pending for Ahmed Al-Rashid.",
      entityType: "booking",
      entityId: null,
      groupKey: "document.missing:branch:b1",
      occurrenceCount: 1,
      status: "open",
      hrefHint: "/missing-docs",
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
    },
    {
      id: "n3",
      branchId: "b1",
      recipientUserId: "u1",
      kind: "booking.confirmed",
      severity: "info",
      title: "Booking confirmed",
      body: "PKG-UMR-2401 balance updated.",
      entityType: "booking",
      entityId: null,
      groupKey: "booking.confirmed:entity:x",
      occurrenceCount: 1,
      status: "acknowledged",
      hrefHint: "/bookings",
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      acknowledgedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      resolvedAt: null,
    },
  ];
  private prefs: NotificationPreference = {
    userId: "u1",
    emailEnabled: false,
    pushEnabled: false,
    inAppMandatory: true,
    updatedAt: new Date().toISOString(),
  };

  async list(params: NotificationListParams = {}) {
    const items = this.items.filter(
      (n) =>
        (params.status
          ? n.status === params.status
          : params.includeResolved || n.status !== "resolved") &&
        (!params.kinds?.length || params.kinds.includes(n.kind)),
    );
    const offset = params.offset ?? 0;
    const page = items.slice(offset, offset + (params.limit ?? 50));
    return { items: page.map((n) => ({ ...n })), total: items.length };
  }

  async summary() {
    const groups = new Map<string, NotificationGroup>();
    for (const n of this.items) {
      if (n.status === "resolved") continue;
      const g = groups.get(n.kind) ?? {
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        href: n.hrefHint,
        open: 0,
        acknowledged: 0,
        occurrences: 0,
        latestAt: n.updatedAt,
      };
      if (n.status === "open") g.open++;
      else g.acknowledged++;
      g.occurrences += n.occurrenceCount;
      if (n.updatedAt > g.latestAt) g.latestAt = n.updatedAt;
      groups.set(n.kind, g);
    }
    return [...groups.values()];
  }

  async unreadCount() {
    return this.items.filter((n) => n.status === "open").length;
  }

  async acknowledge(id: string) {
    const n = this.items.find((x) => x.id === id);
    if (!n) throw new Error("not found");
    n.status = "acknowledged";
    n.acknowledgedAt = new Date().toISOString();
    n.updatedAt = n.acknowledgedAt;
    return { ...n };
  }

  async resolve(id: string) {
    const n = this.items.find((x) => x.id === id);
    if (!n) throw new Error("not found");
    n.status = "resolved";
    n.resolvedAt = new Date().toISOString();
    n.updatedAt = n.resolvedAt;
    return { ...n };
  }

  async acknowledgeAll() {
    let n = 0;
    for (const item of this.items) {
      if (item.status === "open") {
        item.status = "acknowledged";
        item.acknowledgedAt = new Date().toISOString();
        n++;
      }
    }
    return n;
  }

  async getPreferences() {
    return { ...this.prefs };
  }

  async updatePreferences(input: {
    emailEnabled: boolean;
    pushEnabled: boolean;
  }) {
    this.prefs = {
      ...this.prefs,
      emailEnabled: input.emailEnabled,
      pushEnabled: input.pushEnabled,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.prefs };
  }

  async listRules() {
    return [
      {
        kind: "message.sla_breached",
        severity: "critical" as const,
        escalateAfterSeconds: 900,
        escalateToRoles: ["manager", "gm"],
        groupable: true,
        defaultTitle: "Conversation SLA breached",
        defaultHref: "/inbox",
        entityType: "conversation",
      },
    ];
  }
}

let mem: MemoryRepo | null = null;

export function createNotificationRepository(): NotificationRepository {
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<NotificationRepository>({
    api,
    memory: mem,
    reads: ["list", "summary", "unreadCount", "getPreferences", "listRules"],
  });
}
