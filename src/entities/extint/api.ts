import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  CreateExternalIntegrationInput,
  ExtIntCatalogItem,
  ExtIntProvider,
  ExtIntStatus,
  ExternalIntegration,
  ProbeResult,
  UpdateExternalIntegrationInput,
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

function mapCatalog(raw: Raw): ExtIntCatalogItem {
  return {
    id: str(raw.id),
    provider: str(raw.provider, "custom") as ExtIntProvider,
    name: str(raw.name),
    description: str(raw.description),
    configSchema: Array.isArray(raw.config_schema ?? raw.configSchema)
      ? ((raw.config_schema ?? raw.configSchema) as string[])
      : [],
  };
}

function mapIntegration(raw: Raw): ExternalIntegration {
  const cfg = (raw.config ?? {}) as Record<string, unknown>;
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) {
    config[k] = str(v);
  }
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    provider: str(raw.provider, "custom") as ExtIntProvider,
    displayName: str(raw.display_name ?? raw.displayName),
    config,
    enabled: Boolean(raw.enabled ?? true),
    status: str(raw.status ?? "draft") as ExtIntStatus,
    lastProbeAt: (raw.last_probe_at ?? raw.lastProbeAt ?? null) as
      | string
      | null,
    lastError: str(raw.last_error ?? raw.lastError),
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

function mapProbe(raw: Raw): ProbeResult {
  return {
    ok: Boolean(raw.ok),
    status: str(raw.status ?? "healthy") as ExtIntStatus,
    latencyMs: Number(raw.latency_ms ?? raw.latencyMs ?? 0),
    message: str(raw.message),
    probedAt: str(raw.probed_at ?? raw.probedAt ?? new Date().toISOString()),
  };
}

function asRows(data: Raw[] | { items?: Raw[] }): Raw[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}

export interface ExtIntRepository {
  catalog(): Promise<ExtIntCatalogItem[]>;
  list(): Promise<ExternalIntegration[]>;
  create(input: CreateExternalIntegrationInput): Promise<ExternalIntegration>;
  getById(id: string): Promise<ExternalIntegration>;
  update(
    id: string,
    input: UpdateExternalIntegrationInput,
  ): Promise<ExternalIntegration>;
  remove(id: string): Promise<void>;
  probe(id: string): Promise<ProbeResult>;
}

class ApiRepo implements ExtIntRepository {
  constructor(private readonly http: HttpClient) {}

  async catalog() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/external-integrations/catalog",
    );
    return asRows(data).map(mapCatalog);
  }

  async list() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/external-integrations",
    );
    return asRows(data).map(mapIntegration);
  }

  async create(input: CreateExternalIntegrationInput) {
    return mapIntegration(
      await this.http.request<Raw>("/external-integrations", {
        method: "POST",
        body: JSON.stringify({
          provider: input.provider,
          display_name: input.displayName,
          config: input.config ?? {},
          enabled: input.enabled ?? true,
        }),
      }),
    );
  }

  async getById(id: string) {
    return mapIntegration(
      await this.http.request<Raw>(`/external-integrations/${id}`),
    );
  }

  async update(id: string, input: UpdateExternalIntegrationInput) {
    return mapIntegration(
      await this.http.request<Raw>(`/external-integrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_name: input.displayName,
          config: input.config,
          enabled: input.enabled,
        }),
      }),
    );
  }

  async remove(id: string) {
    await this.http.request(`/external-integrations/${id}`, {
      method: "DELETE",
    });
  }

  async probe(id: string) {
    return mapProbe(
      await this.http.request<Raw>(`/external-integrations/${id}/probe`, {
        method: "POST",
      }),
    );
  }
}

const DEFAULT_CATALOG: ExtIntCatalogItem[] = [
  {
    id: "cat-whatsapp",
    provider: "whatsapp",
    name: "WhatsApp Business",
    description: "Send and receive WhatsApp messages via Cloud API",
    configSchema: ["phone_number_id", "access_token"],
  },
  {
    id: "cat-email",
    provider: "email",
    name: "Transactional email",
    description: "SMTP or provider API for booking receipts and alerts",
    configSchema: ["smtp_host", "smtp_user", "smtp_password"],
  },
  {
    id: "cat-sms",
    provider: "sms",
    name: "SMS gateway",
    description: "OTP and operational SMS notifications",
    configSchema: ["api_key", "sender_id"],
  },
  {
    id: "cat-accounting",
    provider: "accounting",
    name: "Accounting sync",
    description: "Push invoices and payments to your ledger",
    configSchema: ["base_url", "api_key", "company_id"],
  },
];

class MemoryRepo implements ExtIntRepository {
  private items: ExternalIntegration[] = [
    {
      id: "ext-1",
      branchId: "br-1",
      provider: "whatsapp",
      displayName: "Branch WhatsApp",
      config: { phone_number_id: "demo" },
      enabled: true,
      status: "healthy",
      lastProbeAt: new Date(Date.now() - 7200_000).toISOString(),
      lastError: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  async catalog() {
    return DEFAULT_CATALOG.map((c) => ({ ...c }));
  }

  async list() {
    return this.items.map((i) => ({ ...i, config: { ...i.config } }));
  }

  async create(input: CreateExternalIntegrationInput) {
    const now = new Date().toISOString();
    const item: ExternalIntegration = {
      id: crypto.randomUUID(),
      branchId: "br-1",
      provider: input.provider,
      displayName: input.displayName,
      config: { ...(input.config ?? {}) },
      enabled: input.enabled ?? true,
      status: "configured",
      lastProbeAt: null,
      lastError: "",
      createdAt: now,
      updatedAt: now,
    };
    this.items.unshift(item);
    return { ...item, config: { ...item.config } };
  }

  async getById(id: string) {
    const item = this.items.find((x) => x.id === id);
    if (!item) throw new Error("integration not found");
    return { ...item, config: { ...item.config } };
  }

  async update(id: string, input: UpdateExternalIntegrationInput) {
    const item = await this.getById(id);
    if (input.displayName != null) item.displayName = input.displayName;
    if (input.config != null) item.config = { ...input.config };
    if (input.enabled != null) {
      item.enabled = input.enabled;
      if (!input.enabled) item.status = "disabled";
    }
    item.updatedAt = new Date().toISOString();
    const i = this.items.findIndex((x) => x.id === id);
    this.items[i] = item;
    return { ...item, config: { ...item.config } };
  }

  async remove(id: string) {
    this.items = this.items.filter((x) => x.id !== id);
  }

  async probe(id: string) {
    const item = await this.getById(id);
    const probedAt = new Date().toISOString();
    const result: ProbeResult = {
      ok: true,
      status: "healthy",
      latencyMs: 42,
      message: "Demo probe OK",
      probedAt,
    };
    item.status = result.status;
    item.lastProbeAt = probedAt;
    item.lastError = "";
    item.updatedAt = probedAt;
    const i = this.items.findIndex((x) => x.id === id);
    this.items[i] = item;
    return result;
  }
}

let mem: MemoryRepo | null = null;

export function createExtIntRepository(): ExtIntRepository {
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
    catalog: wrap(api.catalog.bind(api), mem.catalog.bind(mem)),
    list: wrap(api.list.bind(api), mem.list.bind(mem)),
    create: wrap(api.create.bind(api), mem.create.bind(mem)),
    getById: wrap(api.getById.bind(api), mem.getById.bind(mem)),
    update: wrap(api.update.bind(api), mem.update.bind(mem)),
    remove: wrap(api.remove.bind(api), mem.remove.bind(mem)),
    probe: wrap(api.probe.bind(api), mem.probe.bind(mem)),
  };
}
