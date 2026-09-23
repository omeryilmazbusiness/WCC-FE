import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  RevenueTarget,
  TargetContribution,
  TargetProgress,
  TargetSeriesPoint,
  TargetShare,
  TargetSource,
  TargetWeight,
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

function mapTarget(raw: Raw): RevenueTarget {
  return {
    id: String(raw.id),
    branchId: String(raw.branch_id ?? ""),
    ownerId: (raw.owner_id as string) ?? null,
    teamId: (raw.team_id as string) ?? null,
    label: String(raw.label ?? ""),
    targetAmount: Number(raw.target_amount ?? 0),
    currency: String(raw.currency ?? "SAR"),
    metric: String(raw.metric ?? "collected") as RevenueTarget["metric"],
    scopeType: String(raw.scope_type ?? "branch") as RevenueTarget["scopeType"],
    curveType: String(raw.curve_type ?? "linear") as RevenueTarget["curveType"],
    periodStart: String(raw.period_start ?? ""),
    periodEnd: String(raw.period_end ?? ""),
  };
}

function mapProgress(raw: Raw): TargetProgress {
  return {
    targetId: String(raw.target_id ?? ""),
    label: String(raw.label ?? ""),
    currency: String(raw.currency ?? "SAR"),
    metric: String(raw.metric ?? "collected") as TargetProgress["metric"],
    scopeType: String(raw.scope_type ?? "branch") as TargetProgress["scopeType"],
    curveType: String(raw.curve_type ?? "linear") as TargetProgress["curveType"],
    targetAmount: Number(raw.target_amount ?? 0),
    actualAmount: Number(raw.actual_amount ?? 0),
    expectedToDate: Number(raw.expected_to_date ?? 0),
    variance: Number(raw.variance ?? 0),
    progressBps: Number(raw.progress_bps ?? 0),
    paceBps: Number(raw.pace_bps ?? 0),
    forecastAmount: Number(raw.forecast_amount ?? 0),
    requiredPaceDaily: Number(raw.required_pace_daily ?? 0),
    status: String(raw.status ?? "placeholder") as TargetProgress["status"],
    periodStart: String(raw.period_start ?? ""),
    periodEnd: String(raw.period_end ?? ""),
    asOf: String(raw.as_of ?? ""),
  };
}

export type CreateTargetInput = {
  label: string;
  targetAmount: number;
  currency?: string;
  metric?: string;
  scopeType?: string;
  curveType?: string;
  periodStart: string;
  periodEnd: string;
  ownerId?: string | null;
};

export interface RevenueTargetRepository {
  list(): Promise<RevenueTarget[]>;
  create(input: CreateTargetInput): Promise<RevenueTarget>;
  update(id: string, patch: Partial<CreateTargetInput>): Promise<RevenueTarget>;
  progress(id: string): Promise<TargetProgress>;
  setWeights(id: string, weights: TargetWeight[]): Promise<TargetWeight[]>;
  getWeights(id: string): Promise<TargetWeight[]>;
  setShares(id: string, shares: TargetShare[]): Promise<TargetShare[]>;
  contributions(id: string): Promise<TargetContribution[]>;
  series(id: string): Promise<TargetSeriesPoint[]>;
  sources(id: string): Promise<TargetSource[]>;
  recompute(id: string): Promise<TargetProgress>;
}

class ApiRepo implements RevenueTargetRepository {
  constructor(private readonly http: HttpClient) {}

  async list() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>("/targets");
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapTarget);
  }
  async create(input: CreateTargetInput) {
    return mapTarget(
      await this.http.request<Raw>("/targets", {
        method: "POST",
        body: JSON.stringify({
          label: input.label,
          target_amount: input.targetAmount,
          currency: input.currency,
          metric: input.metric,
          scope_type: input.scopeType,
          curve_type: input.curveType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          owner_id: input.ownerId,
        }),
      }),
    );
  }
  async update(id: string, patch: Partial<CreateTargetInput>) {
    const body: Record<string, unknown> = {};
    if (patch.label != null) body.label = patch.label;
    if (patch.targetAmount != null) body.target_amount = patch.targetAmount;
    if (patch.currency != null) body.currency = patch.currency;
    if (patch.metric != null) body.metric = patch.metric;
    if (patch.scopeType != null) body.scope_type = patch.scopeType;
    if (patch.curveType != null) body.curve_type = patch.curveType;
    if (patch.periodStart != null) body.period_start = patch.periodStart;
    if (patch.periodEnd != null) body.period_end = patch.periodEnd;
    if (patch.ownerId !== undefined) body.owner_id = patch.ownerId;
    return mapTarget(
      await this.http.request<Raw>(`/targets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  }
  async progress(id: string) {
    return mapProgress(await this.http.request<Raw>(`/targets/${id}/progress`));
  }
  async setWeights(id: string, weights: TargetWeight[]) {
    const data = await this.http.request<{ weights?: Raw[] } | Raw[]>(
      `/targets/${id}/weights`,
      {
        method: "PUT",
        body: JSON.stringify({
          weights: weights.map((w) => ({
            bucket: w.bucket,
            weight_bps: w.weightBps,
          })),
        }),
      },
    );
    const rows = Array.isArray(data) ? data : (data.weights ?? []);
    return rows.map((r) => ({
      bucket: Number(r.bucket ?? 0),
      weightBps: Number(r.weight_bps ?? r.weightBps ?? 0),
    }));
  }
  async getWeights(id: string) {
    const data = await this.http.request<Raw[] | { weights?: Raw[] }>(
      `/targets/${id}/weights`,
    );
    const rows = Array.isArray(data) ? data : (data.weights ?? []);
    return rows.map((r) => ({
      bucket: Number(r.bucket ?? 0),
      weightBps: Number(r.weight_bps ?? r.weightBps ?? 0),
    }));
  }
  async setShares(id: string, shares: TargetShare[]) {
    const data = await this.http.request<{ shares?: Raw[] } | Raw[]>(
      `/targets/${id}/shares`,
      {
        method: "PUT",
        body: JSON.stringify({
          shares: shares.map((s) => ({
            user_id: s.userId,
            share_bps: s.shareBps,
          })),
        }),
      },
    );
    const rows = Array.isArray(data) ? data : (data.shares ?? []);
    return rows.map((r) => ({
      userId: String(r.user_id ?? r.userId ?? ""),
      userName: String(r.user_name ?? ""),
      shareBps: Number(r.share_bps ?? 0),
    }));
  }
  async contributions(id: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/targets/${id}/contributions`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map((r) => ({
      userId: String(r.user_id ?? ""),
      userName: String(r.user_name ?? ""),
      shareBps: Number(r.share_bps ?? 0),
      actualAmount: Number(r.actual_amount ?? 0),
      shareAmount: Number(r.share_amount ?? 0),
      rank: Number(r.rank ?? 0),
    }));
  }
  async series(id: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/targets/${id}/series`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map((r) => ({
      date: String(r.date ?? ""),
      actual: Number(r.actual ?? 0),
      expected: Number(r.expected ?? 0),
    }));
  }
  async sources(id: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/targets/${id}/sources`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map((r) => ({
      kind: String(r.kind ?? ""),
      id: String(r.id ?? ""),
      bookingId: String(r.booking_id ?? ""),
      amount: Number(r.amount ?? 0),
      currency: String(r.currency ?? "SAR"),
      ownerId: String(r.owner_id ?? ""),
      ownerName: String(r.owner_name ?? ""),
      occurredAt: String(r.occurred_at ?? ""),
      label: String(r.label ?? ""),
    }));
  }
  async recompute(id: string) {
    return mapProgress(
      await this.http.request<Raw>(`/targets/${id}/recompute`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }
}

class MemoryRepo implements RevenueTargetRepository {
  private targets: RevenueTarget[] = [
    {
      id: "tttttttt-tttt-tttt-tttt-tttttttttt01",
      branchId: "11111111-1111-1111-1111-111111111111",
      ownerId: null,
      teamId: null,
      label: "Season target",
      targetAmount: 100000000,
      currency: "SAR",
      metric: "collected",
      scopeType: "branch",
      curveType: "linear",
      periodStart: `${new Date().getFullYear()}-01-01`,
      periodEnd: `${new Date().getFullYear()}-12-31`,
    },
  ];
  private weights = new Map<string, TargetWeight[]>();
  private shares = new Map<string, TargetShare[]>();

  async list() {
    return [...this.targets];
  }
  async create(input: CreateTargetInput) {
    const t: RevenueTarget = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      ownerId: input.ownerId ?? null,
      teamId: null,
      label: input.label,
      targetAmount: input.targetAmount,
      currency: input.currency ?? "SAR",
      metric: (input.metric as RevenueTarget["metric"]) ?? "collected",
      scopeType: (input.scopeType as RevenueTarget["scopeType"]) ?? "branch",
      curveType: (input.curveType as RevenueTarget["curveType"]) ?? "linear",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    };
    this.targets.push(t);
    return t;
  }
  async update(id: string, patch: Partial<CreateTargetInput>) {
    const t = this.targets.find((x) => x.id === id)!;
    if (patch.label != null) t.label = patch.label;
    if (patch.targetAmount != null) t.targetAmount = patch.targetAmount;
    if (patch.curveType != null) t.curveType = patch.curveType as RevenueTarget["curveType"];
    if (patch.periodStart != null) t.periodStart = patch.periodStart;
    if (patch.periodEnd != null) t.periodEnd = patch.periodEnd;
    return t;
  }
  async progress(id: string): Promise<TargetProgress> {
    const t = this.targets.find((x) => x.id === id)!;
    const actual = Math.round(t.targetAmount * 0.42);
    const expected = Math.round(t.targetAmount * 0.4);
    return {
      targetId: t.id,
      label: t.label,
      currency: t.currency,
      metric: t.metric,
      scopeType: t.scopeType,
      curveType: t.curveType,
      targetAmount: t.targetAmount,
      actualAmount: actual,
      expectedToDate: expected,
      variance: actual - expected,
      progressBps: 4200,
      paceBps: 10500,
      forecastAmount: Math.round(t.targetAmount * 1.05),
      requiredPaceDaily: 50000,
      status: "ahead",
      periodStart: t.periodStart,
      periodEnd: t.periodEnd,
      asOf: new Date().toISOString().slice(0, 10),
    };
  }
  async setWeights(id: string, weights: TargetWeight[]) {
    this.weights.set(id, weights);
    const t = this.targets.find((x) => x.id === id);
    if (t) t.curveType = "seasonal";
    return weights;
  }
  async getWeights(id: string) {
    return this.weights.get(id) ?? [];
  }
  async setShares(id: string, shares: TargetShare[]) {
    this.shares.set(id, shares);
    return shares;
  }
  async contributions(id: string) {
    return [
      {
        userId: "u1",
        userName: "Sales Employee",
        shareBps: 6000,
        actualAmount: 25000000,
        shareAmount: 60000000,
        rank: 1,
      },
      {
        userId: "u2",
        userName: "Branch Manager",
        shareBps: 4000,
        actualAmount: 17000000,
        shareAmount: 40000000,
        rank: 2,
      },
    ];
  }
  async series(id: string) {
    const t = this.targets.find((x) => x.id === id)!;
    const points: TargetSeriesPoint[] = [];
    for (let i = 1; i <= 12; i++) {
      points.push({
        date: `${new Date().getFullYear()}-${String(i).padStart(2, "0")}-01`,
        actual: Math.round((t.targetAmount * i) / 30),
        expected: Math.round((t.targetAmount * i) / 28),
      });
    }
    return points;
  }
  async sources() {
    return [
      {
        kind: "payment",
        id: "p1",
        bookingId: "b1",
        amount: 500000,
        currency: "SAR",
        ownerId: "u1",
        ownerName: "Sales Employee",
        occurredAt: new Date().toISOString(),
        label: "Deposit",
      },
    ];
  }
  async recompute(id: string) {
    return this.progress(id);
  }
}

let mem: MemoryRepo | null = null;

export function createRevenueTargetRepository(): RevenueTargetRepository {
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
    create: wrap(api.create.bind(api), mem.create.bind(mem)),
    update: wrap(api.update.bind(api), mem.update.bind(mem)),
    progress: wrap(api.progress.bind(api), mem.progress.bind(mem)),
    setWeights: wrap(api.setWeights.bind(api), mem.setWeights.bind(mem)),
    getWeights: wrap(api.getWeights.bind(api), mem.getWeights.bind(mem)),
    setShares: wrap(api.setShares.bind(api), mem.setShares.bind(mem)),
    contributions: wrap(api.contributions.bind(api), mem.contributions.bind(mem)),
    series: wrap(api.series.bind(api), mem.series.bind(mem)),
    sources: wrap(api.sources.bind(api), mem.sources.bind(mem)),
    recompute: wrap(api.recompute.bind(api), mem.recompute.bind(mem)),
  };
}
