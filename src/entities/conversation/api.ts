import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  ChannelHealth,
  ConnectCredentials,
  Conversation,
  ConversationListFilter,
  ConversationStatus,
  InboxChannel,
  InboxMessage,
  SocialChannel,
} from "./model";
import { isSLABreached, SOCIAL_CHANNELS } from "./model";

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

export interface ConversationRepository {
  list(filter?: ConversationListFilter): Promise<Conversation[]>;
  get(id: string): Promise<Conversation>;
  listMessages(conversationId: string): Promise<InboxMessage[]>;
  reply(
    conversationId: string,
    body: string,
    opts?: { internalNote?: boolean },
  ): Promise<InboxMessage>;
  assign(conversationId: string, ownerId: string): Promise<Conversation>;
  setStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation>;
  channelHealth(): Promise<ChannelHealth[]>;
  /** Persist BYO credentials for a channel (Meta Cloud / Gmail OAuth tokens). */
  connectChannel(
    provider: SocialChannel,
    credentials: ConnectCredentials,
  ): Promise<ChannelHealth>;
  disconnectChannel(provider: SocialChannel): Promise<ChannelHealth>;
}

type Raw = Record<string, unknown>;

function mapConversation(raw: Raw): Conversation {
  return {
    id: String(raw.id),
    branchId: String(raw.branch_id ?? raw.branchId ?? ""),
    channel: String(raw.channel ?? "stub") as InboxChannel,
    customerId: (raw.customer_id ?? raw.customerId ?? null) as string | null,
    leadId: (raw.lead_id ?? raw.leadId ?? null) as string | null,
    ownerId: (raw.owner_id ?? raw.ownerId ?? null) as string | null,
    ownerName: String(raw.owner_name ?? raw.ownerName ?? ""),
    subject: String(raw.subject ?? ""),
    status: String(raw.status ?? "open") as ConversationStatus,
    slaDueAt: (raw.sla_due_at ?? raw.slaDueAt ?? null) as string | null,
    slaBreachedAt: (raw.sla_breached_at ?? raw.slaBreachedAt ?? null) as
      | string
      | null,
    unansweredSince: (raw.unanswered_since ?? raw.unansweredSince ?? null) as
      | string
      | null,
    lastMessagePreview: String(
      raw.last_message_preview ?? raw.lastMessagePreview ?? "",
    ),
    customerName: String(raw.customer_name ?? raw.customerName ?? ""),
    identityLabel: String(raw.identity_label ?? raw.identityLabel ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

function mapMessage(raw: Raw): InboxMessage {
  return {
    id: String(raw.id),
    conversationId: String(raw.conversation_id ?? raw.conversationId ?? ""),
    direction: String(raw.direction ?? "in") as InboxMessage["direction"],
    body: String(raw.body ?? ""),
    status: String(raw.status ?? "received") as InboxMessage["status"],
    authorName: String(raw.author_name ?? raw.authorName ?? ""),
    errorMessage: String(raw.error_message ?? raw.errorMessage ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

function mapHealth(raw: Raw): ChannelHealth {
  const status = String(raw.status ?? "disconnected");
  // Explicit link flag — health "ok" alone does not mean the tenant finished setup.
  const connected =
    raw.connected === true ||
    status === "connected" ||
    String(raw.connection_state ?? "") === "connected";
  const publicMetaRaw = raw.public_meta ?? raw.publicMeta;
  const publicMeta =
    publicMetaRaw && typeof publicMetaRaw === "object"
      ? (publicMetaRaw as Record<string, string>)
      : undefined;
  return {
    provider: String(raw.provider ?? raw.channel ?? "stub") as InboxChannel,
    displayName: String(
      raw.display_name ?? raw.displayName ?? raw.provider ?? "",
    ),
    status: connected ? status : "disconnected",
    lastError: String(raw.last_error ?? raw.lastError ?? ""),
    lastOkAt: (raw.last_ok_at ?? raw.lastOkAt ?? null) as string | null,
    connected,
    publicMeta,
    webhookPath: String(raw.webhook_path ?? raw.webhookPath ?? "") || undefined,
    webhookUrl: String(raw.webhook_url ?? raw.webhookUrl ?? "") || undefined,
  };
}

export class ApiConversationRepository implements ConversationRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filter: ConversationListFilter = {}): Promise<Conversation[]> {
    const sp = new URLSearchParams();
    if (filter.q) sp.set("q", filter.q);
    if (filter.channel) sp.set("channel", filter.channel);
    if (filter.status) sp.set("status", filter.status);
    if (filter.unassigned) sp.set("unassigned", "true");
    if (filter.mine) sp.set("mine", "true");
    if (filter.slaBreached) sp.set("sla_breached", "true");
    if (filter.unansweredMinutes)
      sp.set("unanswered_minutes", String(filter.unansweredMinutes));
    const qs = sp.toString();
    const data = await this.http.request<{ items?: Raw[] } | Raw[]>(
      `/inbox/conversations${qs ? `?${qs}` : ""}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapConversation);
  }

  async get(id: string): Promise<Conversation> {
    return mapConversation(
      await this.http.request<Raw>(`/inbox/conversations/${id}`),
    );
  }

  async listMessages(conversationId: string): Promise<InboxMessage[]> {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/inbox/conversations/${conversationId}/messages`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapMessage);
  }

  async reply(
    conversationId: string,
    body: string,
    opts?: { internalNote?: boolean },
  ): Promise<InboxMessage> {
    return mapMessage(
      await this.http.request<Raw>(`/inbox/conversations/${conversationId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          body,
          internal_note: Boolean(opts?.internalNote),
        }),
      }),
    );
  }

  async assign(conversationId: string, ownerId: string): Promise<Conversation> {
    return mapConversation(
      await this.http.request<Raw>(
        `/inbox/conversations/${conversationId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ owner_id: ownerId }),
        },
      ),
    );
  }

  async setStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation> {
    return mapConversation(
      await this.http.request<Raw>(
        `/inbox/conversations/${conversationId}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        },
      ),
    );
  }

  async channelHealth(): Promise<ChannelHealth[]> {
    const data = await this.http.request<
      | { accounts?: Raw[]; live?: Raw[] }
      | Raw[]
    >("/integrations/health");
    if (Array.isArray(data)) return data.map(mapHealth);
    const accounts = data.accounts ?? [];
    return accounts.map(mapHealth);
  }

  async connectChannel(
    provider: SocialChannel,
    credentials: ConnectCredentials,
  ): Promise<ChannelHealth> {
    return mapHealth(
      await this.http.request<Raw>(`/integrations/accounts/${provider}/connect`, {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    );
  }

  async disconnectChannel(provider: SocialChannel): Promise<ChannelHealth> {
    return mapHealth(
      await this.http.request<Raw>(
        `/integrations/accounts/${provider}/disconnect`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    );
  }
}

const BRANCH = "11111111-1111-1111-1111-111111111111";
const SALES = "22222222-2222-2222-2222-222222222203";
const MANAGER = "22222222-2222-2222-2222-222222222202";

function seedConversations(): Conversation[] {
  const now = Date.now();
  return [
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccc01",
      branchId: BRANCH,
      channel: "whatsapp",
      customerId: null,
      leadId: null,
      ownerId: null,
      ownerName: "",
      subject: "Umrah inquiry",
      status: "open",
      slaDueAt: new Date(now - 5 * 60_000).toISOString(),
      slaBreachedAt: new Date(now - 5 * 60_000).toISOString(),
      unansweredSince: new Date(now - 20 * 60_000).toISOString(),
      lastMessagePreview: "Do you have April packages?",
      customerName: "",
      identityLabel: "Demo Guest · +905551112233",
      updatedAt: new Date(now - 20 * 60_000).toISOString(),
      createdAt: new Date(now - 20 * 60_000).toISOString(),
    },
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccc02",
      branchId: BRANCH,
      channel: "email",
      customerId: null,
      leadId: null,
      ownerId: SALES,
      ownerName: "Sales Employee",
      subject: "Document question",
      status: "open",
      slaDueAt: new Date(now + 50 * 60_000).toISOString(),
      slaBreachedAt: null,
      unansweredSince: new Date(now - 10 * 60_000).toISOString(),
      lastMessagePreview: "Which documents do I need?",
      customerName: "",
      identityLabel: "Email Guest · guest@example.com",
      updatedAt: new Date(now - 10 * 60_000).toISOString(),
      createdAt: new Date(now - 10 * 60_000).toISOString(),
    },
  ];
}

function seedMessages(): Record<string, InboxMessage[]> {
  return {
    "cccccccc-cccc-cccc-cccc-cccccccccc01": [
      {
        id: "dddddddd-dddd-dddd-dddd-dddddddddd01",
        conversationId: "cccccccc-cccc-cccc-cccc-cccccccccc01",
        direction: "in",
        body: "Do you have April packages?",
        status: "received",
        authorName: "",
        errorMessage: "",
        createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      },
    ],
    "cccccccc-cccc-cccc-cccc-cccccccccc02": [
      {
        id: "dddddddd-dddd-dddd-dddd-dddddddddd02",
        conversationId: "cccccccc-cccc-cccc-cccc-cccccccccc02",
        direction: "in",
        body: "Which documents do I need?",
        status: "received",
        authorName: "",
        errorMessage: "",
        createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    ],
  };
}

export class MemoryConversationRepository implements ConversationRepository {
  branchId = BRANCH;
  private conversations = seedConversations();
  private messages = seedMessages();

  async list(filter: ConversationListFilter = {}): Promise<Conversation[]> {
    let rows = [...this.conversations];
    if (filter.status) rows = rows.filter((c) => c.status === filter.status);
    else rows = rows.filter((c) => c.status === "open");
    if (filter.channel) rows = rows.filter((c) => c.channel === filter.channel);
    if (filter.unassigned) rows = rows.filter((c) => !c.ownerId);
    if (filter.mine) rows = rows.filter((c) => c.ownerId === SALES);
    if (filter.slaBreached)
      rows = rows.filter((c) => isSLABreached(c));
    if (filter.unansweredMinutes) {
      const minMs = filter.unansweredMinutes * 60_000;
      const now = Date.now();
      rows = rows.filter(
        (c) =>
          c.unansweredSince &&
          now - new Date(c.unansweredSince).getTime() >= minMs,
      );
    }
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.lastMessagePreview.toLowerCase().includes(q) ||
          c.identityLabel.toLowerCase().includes(q),
      );
    }
    return rows.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async get(id: string): Promise<Conversation> {
    const c = this.conversations.find((x) => x.id === id);
    if (!c) throw new Error("conversation not found");
    return c;
  }

  async listMessages(conversationId: string): Promise<InboxMessage[]> {
    return [...(this.messages[conversationId] ?? [])].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  async reply(
    conversationId: string,
    body: string,
    opts?: { internalNote?: boolean },
  ): Promise<InboxMessage> {
    const c = await this.get(conversationId);
    const msg: InboxMessage = {
      id: crypto.randomUUID(),
      conversationId,
      direction: opts?.internalNote ? "note" : "out",
      body,
      status: opts?.internalNote ? "noted" : "sent",
      authorName: "You",
      errorMessage: "",
      createdAt: new Date().toISOString(),
    };
    this.messages[conversationId] = [
      ...(this.messages[conversationId] ?? []),
      msg,
    ];
    if (!opts?.internalNote) {
      c.unansweredSince = null;
      c.slaBreachedAt = null;
      c.lastMessagePreview = body.slice(0, 140);
      c.updatedAt = msg.createdAt;
    }
    return msg;
  }

  async assign(conversationId: string, ownerId: string): Promise<Conversation> {
    const c = await this.get(conversationId);
    c.ownerId = ownerId;
    c.ownerName =
      ownerId === MANAGER ? "Branch Manager" : "Sales Employee";
    c.updatedAt = new Date().toISOString();
    return c;
  }

  async setStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation> {
    const c = await this.get(conversationId);
    c.status = status;
    c.updatedAt = new Date().toISOString();
    if (status !== "open") {
      c.unansweredSince = null;
    }
    return c;
  }

  async channelHealth(): Promise<ChannelHealth[]> {
    return loadSocialAccounts(this.branchId);
  }

  async connectChannel(
    provider: SocialChannel,
    _credentials: ConnectCredentials,
  ): Promise<ChannelHealth> {
    const accounts = loadSocialAccounts(this.branchId);
    const next = accounts.map((a) =>
      a.provider === provider
        ? {
            ...a,
            connected: true,
            status: "connected" as const,
            lastError: "",
            lastOkAt: new Date().toISOString(),
            publicMeta: {
              ...(_credentials.phone_number_id
                ? { phone_number_id: _credentials.phone_number_id }
                : {}),
              ...(_credentials.page_id ? { page_id: _credentials.page_id } : {}),
              ...(_credentials.mailbox_email
                ? { mailbox_email: _credentials.mailbox_email }
                : {}),
              ...(_credentials.verify_token
                ? { verify_token: _credentials.verify_token }
                : { verify_token: "demo-verify-token" }),
            },
            webhookPath: `/v1/webhooks/${provider}`,
            webhookUrl: `/v1/webhooks/${provider}?branch_id=${this.branchId}`,
          }
        : a,
    );
    saveSocialAccounts(this.branchId, next);
    return next.find((a) => a.provider === provider)!;
  }

  async disconnectChannel(provider: SocialChannel): Promise<ChannelHealth> {
    const accounts = loadSocialAccounts(this.branchId);
    const next = accounts.map((a) =>
      a.provider === provider
        ? {
            ...a,
            connected: false,
            status: "disconnected" as const,
            lastError: "",
            lastOkAt: null,
          }
        : a,
    );
    saveSocialAccounts(this.branchId, next);
    return next.find((a) => a.provider === provider)!;
  }
}

const SOCIAL_STORAGE = "wcc.inbox.social.";

function defaultSocialAccounts(): ChannelHealth[] {
  return [
    {
      provider: "whatsapp",
      displayName: "WhatsApp Business",
      status: "disconnected",
      lastError: "",
      lastOkAt: null,
      connected: false,
    },
    {
      provider: "instagram",
      displayName: "Instagram",
      status: "disconnected",
      lastError: "",
      lastOkAt: null,
      connected: false,
    },
    {
      provider: "facebook",
      displayName: "Facebook Messenger",
      status: "disconnected",
      lastError: "",
      lastOkAt: null,
      connected: false,
    },
    {
      provider: "gmail",
      displayName: "Gmail",
      status: "disconnected",
      lastError: "",
      lastOkAt: null,
      connected: false,
    },
  ];
}

function loadSocialAccounts(branchId: string): ChannelHealth[] {
  if (typeof window === "undefined") return defaultSocialAccounts();
  try {
    const raw = window.localStorage.getItem(SOCIAL_STORAGE + branchId);
    if (!raw) return defaultSocialAccounts();
    const parsed = JSON.parse(raw) as ChannelHealth[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultSocialAccounts();
    }
    // Ensure all social channels exist
    const by = new Map(parsed.map((a) => [a.provider, a]));
    return SOCIAL_CHANNELS.map((p) => {
      const existing = by.get(p);
      if (existing) {
        return {
          ...existing,
          connected: Boolean(existing.connected),
        };
      }
      return defaultSocialAccounts().find((a) => a.provider === p)!;
    });
  } catch {
    return defaultSocialAccounts();
  }
}

function saveSocialAccounts(branchId: string, accounts: ChannelHealth[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SOCIAL_STORAGE + branchId,
    JSON.stringify(accounts),
  );
}

let memSingleton: MemoryConversationRepository | null = null;

export function getMemoryConversationRepository(): MemoryConversationRepository {
  if (!memSingleton) memSingleton = new MemoryConversationRepository();
  return memSingleton;
}

export function createConversationRepository(
  branchId = BRANCH,
): ConversationRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiConversationRepository(http);
  const memory = getMemoryConversationRepository();
  memory.branchId = branchId;
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
    list: wrap(api.list.bind(api), memory.list.bind(memory)),
    get: wrap(api.get.bind(api), memory.get.bind(memory)),
    listMessages: wrap(
      api.listMessages.bind(api),
      memory.listMessages.bind(memory),
    ),
    reply: wrap(api.reply.bind(api), memory.reply.bind(memory)),
    assign: wrap(api.assign.bind(api), memory.assign.bind(memory)),
    setStatus: wrap(api.setStatus.bind(api), memory.setStatus.bind(memory)),
    channelHealth: wrap(
      api.channelHealth.bind(api),
      memory.channelHealth.bind(memory),
    ),
    connectChannel: wrap(
      api.connectChannel.bind(api),
      memory.connectChannel.bind(memory),
    ),
    disconnectChannel: wrap(
      api.disconnectChannel.bind(api),
      memory.disconnectChannel.bind(memory),
    ),
  };
}
