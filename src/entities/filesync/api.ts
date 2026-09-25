import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  CreateFileSyncConnectionInput,
  FileSyncConnection,
  FileSyncConflictPolicy,
  FileSyncConnectionStatus,
  FileSyncProvider,
  FileSyncRun,
  FileSyncRunStatus,
  FileSyncSourceOfTruth,
  UpdateFileSyncConnectionInput,
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

function mapConnection(raw: Raw): FileSyncConnection {
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    provider: str(raw.provider, "onedrive") as FileSyncProvider,
    displayName: str(raw.display_name ?? raw.displayName),
    remotePath: str(raw.remote_path ?? raw.remotePath),
    entityType: str(raw.entity_type ?? raw.entityType, "customers"),
    sourceOfTruth: str(
      raw.source_of_truth ?? raw.sourceOfTruth ?? "platform",
    ) as FileSyncSourceOfTruth,
    conflictPolicy: str(
      raw.conflict_policy ?? raw.conflictPolicy ?? "flag",
    ) as FileSyncConflictPolicy,
    enabled: Boolean(raw.enabled ?? true),
    status: str(
      raw.status ?? "draft",
    ) as FileSyncConnectionStatus,
    lastSyncAt: (raw.last_sync_at ?? raw.lastSyncAt ?? null) as string | null,
    lastError: str(raw.last_error ?? raw.lastError),
  };
}

function mapRun(raw: Raw): FileSyncRun {
  return {
    id: str(raw.id),
    connectionId: str(raw.connection_id ?? raw.connectionId),
    status: str(raw.status ?? "queued") as FileSyncRunStatus,
    startedAt: str(raw.started_at ?? raw.startedAt),
    finishedAt: (raw.finished_at ?? raw.finishedAt ?? null) as string | null,
    filesScanned: Number(raw.files_scanned ?? raw.filesScanned ?? 0),
    filesChanged: Number(raw.files_changed ?? raw.filesChanged ?? 0),
    conflicts: Number(raw.conflicts ?? 0),
    error: str(raw.error),
  };
}

function asRows(data: Raw[] | { items?: Raw[] }): Raw[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}

export interface FileSyncRepository {
  listConnections(): Promise<FileSyncConnection[]>;
  createConnection(
    input: CreateFileSyncConnectionInput,
  ): Promise<FileSyncConnection>;
  getConnection(id: string): Promise<FileSyncConnection>;
  updateConnection(
    id: string,
    input: UpdateFileSyncConnectionInput,
  ): Promise<FileSyncConnection>;
  deleteConnection(id: string): Promise<void>;
  connect(id: string): Promise<FileSyncConnection>;
  sync(id: string): Promise<FileSyncRun>;
  listRuns(connectionId?: string): Promise<FileSyncRun[]>;
}

class ApiRepo implements FileSyncRepository {
  constructor(private readonly http: HttpClient) {}

  async listConnections() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/file-sync/connections",
    );
    return asRows(data).map(mapConnection);
  }

  async createConnection(input: CreateFileSyncConnectionInput) {
    return mapConnection(
      await this.http.request<Raw>("/file-sync/connections", {
        method: "POST",
        body: JSON.stringify({
          provider: input.provider,
          display_name: input.displayName,
          remote_path: input.remotePath,
          entity_type: input.entityType,
          source_of_truth: input.sourceOfTruth ?? "platform",
          conflict_policy: input.conflictPolicy ?? "flag",
          enabled: input.enabled ?? true,
        }),
      }),
    );
  }

  async getConnection(id: string) {
    return mapConnection(
      await this.http.request<Raw>(`/file-sync/connections/${id}`),
    );
  }

  async updateConnection(id: string, input: UpdateFileSyncConnectionInput) {
    return mapConnection(
      await this.http.request<Raw>(`/file-sync/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_name: input.displayName,
          remote_path: input.remotePath,
          entity_type: input.entityType,
          source_of_truth: input.sourceOfTruth,
          conflict_policy: input.conflictPolicy,
          enabled: input.enabled,
        }),
      }),
    );
  }

  async deleteConnection(id: string) {
    await this.http.request(`/file-sync/connections/${id}`, {
      method: "DELETE",
    });
  }

  async connect(id: string) {
    return mapConnection(
      await this.http.request<Raw>(`/file-sync/connections/${id}/connect`, {
        method: "POST",
      }),
    );
  }

  async sync(id: string) {
    return mapRun(
      await this.http.request<Raw>(`/file-sync/connections/${id}/sync`, {
        method: "POST",
      }),
    );
  }

  async listRuns(connectionId?: string) {
    const q = connectionId
      ? `?connection_id=${encodeURIComponent(connectionId)}`
      : "";
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/file-sync/runs${q}`,
    );
    return asRows(data).map(mapRun);
  }
}

class MemoryRepo implements FileSyncRepository {
  private connections: FileSyncConnection[] = [
    {
      id: "fs-1",
      branchId: "br-1",
      provider: "onedrive",
      displayName: "Ops shared folder",
      remotePath: "/WCC/Customers",
      entityType: "customers",
      sourceOfTruth: "platform",
      conflictPolicy: "flag",
      enabled: true,
      status: "connected",
      lastSyncAt: new Date(Date.now() - 3600_000).toISOString(),
      lastError: "",
    },
  ];
  private runs: FileSyncRun[] = [
    {
      id: "run-1",
      connectionId: "fs-1",
      status: "completed",
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
      finishedAt: new Date(Date.now() - 3500_000).toISOString(),
      filesScanned: 12,
      filesChanged: 3,
      conflicts: 0,
      error: "",
    },
  ];

  async listConnections() {
    return this.connections.map((c) => ({ ...c }));
  }

  async createConnection(input: CreateFileSyncConnectionInput) {
    const c: FileSyncConnection = {
      id: crypto.randomUUID(),
      branchId: "br-1",
      provider: input.provider,
      displayName: input.displayName,
      remotePath: input.remotePath,
      entityType: input.entityType,
      sourceOfTruth: input.sourceOfTruth ?? "platform",
      conflictPolicy: input.conflictPolicy ?? "flag",
      enabled: input.enabled ?? true,
      status: "draft",
      lastSyncAt: null,
      lastError: "",
    };
    this.connections.unshift(c);
    return { ...c };
  }

  async getConnection(id: string) {
    const c = this.connections.find((x) => x.id === id);
    if (!c) throw new Error("connection not found");
    return { ...c };
  }

  async updateConnection(id: string, input: UpdateFileSyncConnectionInput) {
    const c = await this.getConnection(id);
    if (input.displayName != null) c.displayName = input.displayName;
    if (input.remotePath != null) c.remotePath = input.remotePath;
    if (input.entityType != null) c.entityType = input.entityType;
    if (input.sourceOfTruth != null) c.sourceOfTruth = input.sourceOfTruth;
    if (input.conflictPolicy != null) c.conflictPolicy = input.conflictPolicy;
    if (input.enabled != null) {
      c.enabled = input.enabled;
      if (!input.enabled) c.status = "disabled";
    }
    const i = this.connections.findIndex((x) => x.id === id);
    this.connections[i] = c;
    return { ...c };
  }

  async deleteConnection(id: string) {
    this.connections = this.connections.filter((c) => c.id !== id);
    this.runs = this.runs.filter((r) => r.connectionId !== id);
  }

  async connect(id: string) {
    const c = await this.getConnection(id);
    c.status = "connected";
    c.lastError = "";
    const i = this.connections.findIndex((x) => x.id === id);
    this.connections[i] = c;
    return { ...c };
  }

  async sync(id: string) {
    const c = await this.getConnection(id);
    c.status = "syncing";
    const started = new Date().toISOString();
    const run: FileSyncRun = {
      id: crypto.randomUUID(),
      connectionId: id,
      status: "running",
      startedAt: started,
      finishedAt: null,
      filesScanned: 0,
      filesChanged: 0,
      conflicts: 0,
      error: "",
    };
    this.runs.unshift(run);
    run.status = "completed";
    run.finishedAt = new Date().toISOString();
    run.filesScanned = 8;
    run.filesChanged = 2;
    c.status = "connected";
    c.lastSyncAt = run.finishedAt;
    c.lastError = "";
    const i = this.connections.findIndex((x) => x.id === id);
    this.connections[i] = c;
    this.runs[0] = run;
    return { ...run };
  }

  async listRuns(connectionId?: string) {
    return this.runs
      .filter((r) => !connectionId || r.connectionId === connectionId)
      .map((r) => ({ ...r }));
  }
}

let mem: MemoryRepo | null = null;

export function createFileSyncRepository(): FileSyncRepository {
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
    listConnections: wrap(
      api.listConnections.bind(api),
      mem.listConnections.bind(mem),
    ),
    createConnection: wrap(
      api.createConnection.bind(api),
      mem.createConnection.bind(mem),
    ),
    getConnection: wrap(api.getConnection.bind(api), mem.getConnection.bind(mem)),
    updateConnection: wrap(
      api.updateConnection.bind(api),
      mem.updateConnection.bind(mem),
    ),
    deleteConnection: wrap(
      api.deleteConnection.bind(api),
      mem.deleteConnection.bind(mem),
    ),
    connect: wrap(api.connect.bind(api), mem.connect.bind(mem)),
    sync: wrap(api.sync.bind(api), mem.sync.bind(mem)),
    listRuns: wrap(api.listRuns.bind(api), mem.listRuns.bind(mem)),
  };
}
