import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  AppNotification,
  EscalationRule,
  NotificationPreference,
  NotificationSeverity,
  NotificationStatus,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

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
  list(params?: {
    status?: NotificationStatus;
    includeResolved?: boolean;
  }): Promise<{ items: AppNotification[]; total: number }>;
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

  async list(params?: {
    status?: NotificationStatus;
    includeResolved?: boolean;
  }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.includeResolved) sp.set("include_resolved", "true");
    const q = sp.toString() ? `?${sp}` : "";
    const rows = await this.http.request<Raw[]>(`/notifications${q}`);
    const list = Array.isArray(rows) ? rows : [];
    return { items: list.map(mapNotification), total: list.length };
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

  async list() {
    const items = this.items.filter((n) => n.status !== "resolved");
    return { items: [...items], total: items.length };
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
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    list: wrap(api.list.bind(api), mem.list.bind(mem)),
    unreadCount: wrap(api.unreadCount.bind(api), mem.unreadCount.bind(mem)),
    acknowledge: wrap(api.acknowledge.bind(api), mem.acknowledge.bind(mem)),
    resolve: wrap(api.resolve.bind(api), mem.resolve.bind(mem)),
    acknowledgeAll: wrap(
      api.acknowledgeAll.bind(api),
      mem.acknowledgeAll.bind(mem),
    ),
    getPreferences: wrap(
      api.getPreferences.bind(api),
      mem.getPreferences.bind(mem),
    ),
    updatePreferences: wrap(
      api.updatePreferences.bind(api),
      mem.updatePreferences.bind(mem),
    ),
    listRules: wrap(api.listRules.bind(api), mem.listRules.bind(mem)),
  };
}
