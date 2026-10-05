import { http, type HttpClient, type HttpMethod } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import { applyEntry, availabilityOn, contractDaysLeft, rankSuppliers } from "./lib/funds";
import {
  BLOCK_REASONS,
  CREDENTIAL_KEYS,
  DEFAULT_CURRENCY,
  DISPUTE_STATUSES,
  ENTRY_KINDS,
  ENVIRONMENTS,
  HEALTH_STATUSES,
  INTEGRATION_TYPES,
  INVOICE_STATUSES,
  ISSUE_KINDS,
  ISSUE_SEVERITIES,
  PAYMENT_MODELS,
  PAYMENT_TERMS,
  PRODUCTS,
  REGIONS,
  SUPPLIER_CATEGORIES,
  WARNINGS,
  type Availability,
  type ConfirmationStatus,
  type CreateIssueInput,
  type CredentialKey,
  type Dispute,
  type DisputeInput,
  type DisputeStatus,
  type HealthStatus,
  type IssueEvent,
  type LedgerEntry,
  type LedgerInput,
  type Markups,
  type Metrics,
  type Product,
  type RouteOption,
  type Supplier,
  type SupplierDetail,
  type SupplierInput,
  type SupplierInvoice,
  type SupplierInvoiceLine,
  type SupplierInvoiceStatus,
  type SupplierLink,
  type SupplierLinkType,
  type SupplierListFilter,
  type SupplierListItem,
  type UsageInput,
} from "./model";

export type CreateLinkInput = {
  linkType: SupplierLinkType;
  linkId: string;
  allotment?: number;
  unitCost?: number;
  currency?: string;
  notes?: string;
};

export type InvoiceLineInput = { description: string; quantity: number; unitCost: number; linkId?: string };

export type CreateInvoiceInput = {
  supplierId: string;
  invoiceNumber: string;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  taxTotal?: number;
  lines?: InvoiceLineInput[];
};

export interface SupplierRepository {
  list(filter?: SupplierListFilter): Promise<SupplierListItem[]>;
  get(id: string): Promise<SupplierDetail>;
  create(input: SupplierInput): Promise<Supplier>;
  update(id: string, input: SupplierInput): Promise<Supplier>;
  setActive(id: string, active: boolean): Promise<Supplier>;
  healthCheck(id: string): Promise<Supplier>;
  setHealth(id: string, status: HealthStatus, note: string): Promise<Supplier>;
  recordUsage(id: string, input: UsageInput): Promise<Metrics>;
  listLedger(id: string): Promise<LedgerEntry[]>;
  postLedger(id: string, input: LedgerInput): Promise<{ entry: LedgerEntry; supplier: Supplier }>;
  routing(product: Product): Promise<RouteOption[]>;
  openDispute(id: string, input: DisputeInput): Promise<Dispute>;
  closeDispute(id: string, disputeId: string, status: Exclude<DisputeStatus, "open">, resolution: string): Promise<Dispute>;

  listLinks(supplierId: string): Promise<SupplierLink[]>;
  addLink(supplierId: string, input: CreateLinkInput): Promise<SupplierLink>;
  deleteLink(supplierId: string, linkId: string): Promise<void>;
  confirmLink(linkId: string, confirmationRef?: string): Promise<SupplierLink>;
  listUnconfirmed(): Promise<SupplierLink[]>;
  listOversold(): Promise<SupplierLink[]>;
  listInvoices(supplierId: string): Promise<SupplierInvoice[]>;
  getInvoice(id: string): Promise<SupplierInvoice>;
  createInvoice(input: CreateInvoiceInput): Promise<SupplierInvoice>;
  updateInvoiceStatus(id: string, status: SupplierInvoiceStatus): Promise<SupplierInvoice>;
  setInvoiceLines(id: string, lines: InvoiceLineInput[]): Promise<SupplierInvoice>;
  listIssues(supplierId: string): Promise<IssueEvent[]>;
  createIssue(supplierId: string, input: CreateIssueInput): Promise<IssueEvent>;
}

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rows = (v: unknown): Raw[] => (Array.isArray(v) ? v : list(obj(v).items)).map(obj);
const optStr = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const day = (v: unknown): string => str(v).slice(0, 10);
const optDay = (v: unknown): string | null => (typeof v === "string" && v ? v.slice(0, 10) : null);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  (allowed as readonly string[]).includes(str(v)) ? (str(v) as T) : d;

function mapMarkups(v: unknown): Markups {
  const out: Markups = {};
  for (const [k, bps] of Object.entries(obj(v))) {
    if ((PRODUCTS as readonly string[]).includes(k) && num(bps) > 0) out[k as Product] = num(bps);
  }
  return out;
}

function mapAvailability(v: unknown): Availability {
  const a = obj(v);
  const reason = str(a.reason);
  return {
    bookable: a.bookable === true,
    reason: (BLOCK_REASONS as readonly string[]).includes(reason) ? (reason as Availability["reason"]) : "",
    warnings: list(a.warnings).filter((w): w is Availability["warnings"][number] => (WARNINGS as readonly unknown[]).includes(w)),
  };
}

export function mapSupplier(raw: Raw): Supplier {
  const integration = obj(raw.integration);
  const health = obj(raw.health);
  const finance = obj(raw.finance);
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id),
    code: str(raw.code),
    nameEn: str(raw.name_en),
    nameAr: str(raw.name_ar),
    category: pick(raw.category, SUPPLIER_CATEGORIES, "other"),
    contactName: str(raw.contact_name),
    contactPhone: str(raw.contact_phone),
    contactEmail: str(raw.contact_email),
    emergencyPhone: str(raw.emergency_phone),
    terms: str(raw.terms),
    integration: {
      type: pick(integration.type, INTEGRATION_TYPES, "manual"),
      environment: pick(integration.environment, ENVIRONMENTS, "sandbox"),
      apiBaseUrl: str(integration.api_base_url),
      webhookUrl: str(integration.webhook_url),
    },
    health: {
      status: pick(health.status, HEALTH_STATUSES, "unknown"),
      latencyMs: num(health.latency_ms),
      checkedAt: optStr(health.checked_at),
      note: str(health.note),
    },
    finance: {
      paymentModel: pick(finance.payment_model, PAYMENT_MODELS, "postpaid"),
      currency: str(finance.currency, DEFAULT_CURRENCY) || DEFAULT_CURRENCY,
      depositBalance: num(finance.deposit_balance),
      creditLimit: num(finance.credit_limit),
      creditUsed: num(finance.credit_used),
      lowBalanceThreshold: num(finance.low_balance_threshold),
      paymentTerms: pick(finance.payment_terms, PAYMENT_TERMS, "net30"),
    },
    markups: mapMarkups(raw.markups),
    regions: list(raw.regions).filter((r): r is Supplier["regions"][number] => (REGIONS as readonly unknown[]).includes(r)),
    freeCancelHours: num(raw.free_cancel_hours),
    contractStart: optDay(raw.contract_start),
    contractEnd: optDay(raw.contract_end),
    isActive: raw.is_active !== false,
    availability: mapAvailability(raw.availability),
    contractDaysLeft: raw.contract_days_left == null ? null : num(raw.contract_days_left),
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  };
}

function mapListItem(raw: Raw): SupplierListItem {
  return {
    ...mapSupplier(raw),
    hasCredentials: raw.has_credentials === true,
    openDisputes: num(raw.open_disputes),
    spend30d: num(raw.spend_30d),
    bookings30d: num(raw.bookings_30d),
  };
}

function mapMetrics(v: unknown): Metrics {
  const m = obj(v);
  return {
    searches: num(m.searches),
    bookings: num(m.bookings),
    errors: num(m.errors),
    priceChanges: num(m.price_changes),
    soldOuts: num(m.sold_outs),
    avgLatencyMs: num(m.avg_latency_ms),
    lookToBook: num(m.look_to_book),
    errorRatePct: num(m.error_rate_pct),
    failedBookingPct: num(m.failed_booking_pct),
    windowDays: num(m.window_days, 30),
  };
}

function mapLedger(v: unknown): LedgerEntry {
  const e = obj(v);
  return {
    id: str(e.id),
    supplierId: str(e.supplier_id),
    kind: pick(e.kind, ENTRY_KINDS, "adjustment"),
    amount: num(e.amount),
    currency: str(e.currency, DEFAULT_CURRENCY),
    balanceAfter: num(e.balance_after),
    reference: str(e.reference),
    note: str(e.note),
    actorId: optStr(e.actor_id),
    createdAt: str(e.created_at),
  };
}

function mapDispute(v: unknown): Dispute {
  const d = obj(v);
  return {
    id: str(d.id),
    supplierId: str(d.supplier_id),
    title: str(d.title),
    bookingRef: str(d.booking_ref),
    amount: num(d.amount),
    currency: str(d.currency, DEFAULT_CURRENCY),
    status: pick(d.status, DISPUTE_STATUSES, "open"),
    resolution: str(d.resolution),
    openedAt: str(d.opened_at),
    resolvedAt: optStr(d.resolved_at),
  };
}

export function mapDetail(raw: Raw): SupplierDetail {
  const creds = obj(raw.credentials);
  const credentials: SupplierDetail["credentials"] = {};
  for (const k of CREDENTIAL_KEYS) if (typeof creds[k] === "string") credentials[k] = creds[k] as string;
  const disputes = list(raw.disputes).map(mapDispute);
  return {
    supplier: mapSupplier(raw),
    credentials,
    metrics: mapMetrics(raw.metrics),
    volume: { spend: num(obj(raw.volume).spend), bookings: num(obj(raw.volume).bookings), refunds: num(obj(raw.volume).refunds) },
    ledger: list(raw.ledger).map(mapLedger),
    canViewLedger: raw.can_view_ledger === true,
    disputes,
    openDisputes: num(raw.open_disputes, disputes.filter((d) => d.status === "open").length),
    today: day(raw.today) || new Date().toISOString().slice(0, 10),
  };
}

function mapRoute(v: unknown): RouteOption {
  const o = obj(v);
  return {
    supplierId: str(o.supplier_id),
    code: str(o.code),
    nameEn: str(o.name_en),
    nameAr: str(o.name_ar),
    category: pick(o.category, SUPPLIER_CATEGORIES, "other"),
    availability: mapAvailability(o.availability),
    score: num(o.score),
    markupBps: num(o.markup_bps),
    health: pick(o.health, HEALTH_STATUSES, "unknown"),
    latencyMs: num(o.latency_ms),
    currency: str(o.currency, DEFAULT_CURRENCY),
  };
}

export function supplierPayload(input: SupplierInput): Raw {
  const credentials: Raw = {};
  for (const k of CREDENTIAL_KEYS) if (input.credentials[k] !== undefined) credentials[k] = input.credentials[k];
  return {
    code: input.code,
    name_en: input.nameEn,
    name_ar: input.nameAr,
    category: input.category,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    contact_email: input.contactEmail,
    emergency_phone: input.emergencyPhone,
    terms: input.terms,
    integration_type: input.integrationType,
    environment: input.environment,
    api_base_url: input.apiBaseUrl,
    webhook_url: input.webhookUrl,
    credentials,
    payment_model: input.paymentModel,
    currency: input.currency,
    credit_limit: input.creditLimit,
    low_balance_threshold: input.lowBalanceThreshold,
    payment_terms: input.paymentTerms,
    markups: input.markups,
    regions: input.regions,
    free_cancel_hours: input.freeCancelHours,
    contract_start: input.contractStart,
    contract_end: input.contractEnd,
    is_active: input.isActive,
  };
}

function mapLink(raw: Raw): SupplierLink {
  const allotment = num(raw.allotment);
  const sold = num(raw.sold);
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id),
    linkType: pick(raw.link_type, ["package", "departure", "service"] as const, "service"),
    linkId: str(raw.link_id),
    confirmationStatus: pick(raw.confirmation_status, ["pending", "confirmed", "cancelled"] as const, "pending") as ConfirmationStatus,
    confirmationRef: str(raw.confirmation_ref),
    confirmedAt: optStr(raw.confirmed_at),
    allotment,
    sold,
    unitCost: num(raw.unit_cost),
    currency: str(raw.currency, DEFAULT_CURRENCY),
    notes: str(raw.notes),
    oversold: raw.oversold === true || (allotment > 0 && sold > allotment),
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  };
}

function mapInvoiceLine(raw: Raw): SupplierInvoiceLine {
  const quantity = num(raw.quantity, 1);
  const unitCost = num(raw.unit_cost);
  return {
    id: str(raw.id),
    description: str(raw.description),
    quantity,
    unitCost,
    linkId: optStr(raw.link_id),
    lineTotal: num(raw.line_total, quantity * unitCost),
  };
}

function mapInvoice(raw: Raw): SupplierInvoice {
  const lines = list(raw.lines).map((l) => mapInvoiceLine(obj(l)));
  const subtotal = num(raw.subtotal, lines.reduce((s, l) => s + l.lineTotal, 0));
  const taxTotal = num(raw.tax_total);
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id),
    branchId: str(raw.branch_id),
    invoiceNumber: str(raw.invoice_number),
    status: pick(raw.status, INVOICE_STATUSES, "draft"),
    currency: str(raw.currency, DEFAULT_CURRENCY),
    issueDate: day(raw.issued_on),
    dueDate: day(raw.due_on),
    notes: str(raw.notes),
    subtotal,
    taxTotal,
    total: num(raw.grand_total, subtotal + taxTotal),
    lines,
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  };
}

function mapIssue(raw: Raw): IssueEvent {
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id),
    kind: pick(raw.kind, ISSUE_KINDS, "note"),
    severity: pick(raw.severity, ISSUE_SEVERITIES, "info"),
    note: str(raw.note),
    actorId: optStr(raw.actor_id),
    createdAt: str(raw.created_at),
  };
}

/** YYYY-MM-DD → RFC 3339 midnight UTC, the shape Go's time.Time decodes. */
const dayToTimestamp = (d?: string) => (d ? `${d.slice(0, 10)}T00:00:00Z` : undefined);

const linePayload = (l: InvoiceLineInput) => ({ description: l.description, quantity: l.quantity, unit_cost: l.unitCost, link_id: l.linkId || undefined });

export class ApiSupplierRepository implements SupplierRepository {
  constructor(private readonly client: HttpClient) {}

  private base(id?: string) {
    return id ? `/suppliers/${encodeURIComponent(id)}` : "/suppliers";
  }

  private send<T>(path: string, method: HttpMethod, body?: unknown) {
    return this.client.request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async list(filter: SupplierListFilter = {}) {
    const q = new URLSearchParams();
    if (filter.q?.trim()) q.set("q", filter.q.trim());
    if (filter.category) q.set("category", filter.category);
    if (filter.activeOnly) q.set("active", "true");
    const qs = q.toString();
    return rows(await this.client.request<unknown>(`${this.base()}${qs ? `?${qs}` : ""}`)).map(mapListItem);
  }

  async get(id: string) {
    return mapDetail(await this.client.request<Raw>(this.base(id)));
  }

  async create(input: SupplierInput) {
    return mapSupplier(await this.send<Raw>(this.base(), "POST", supplierPayload(input)));
  }

  async update(id: string, input: SupplierInput) {
    return mapSupplier(await this.send<Raw>(this.base(id), "PUT", supplierPayload(input)));
  }

  async setActive(id: string, active: boolean) {
    return mapSupplier(await this.send<Raw>(this.base(id), "PATCH", { is_active: active }));
  }

  async healthCheck(id: string) {
    return mapSupplier(await this.send<Raw>(`${this.base(id)}/health-check`, "POST"));
  }

  async setHealth(id: string, status: HealthStatus, note: string) {
    return mapSupplier(await this.send<Raw>(`${this.base(id)}/health`, "POST", { status, note }));
  }

  async recordUsage(id: string, input: UsageInput) {
    return mapMetrics(
      await this.send<Raw>(`${this.base(id)}/usage`, "POST", {
        day: input.day,
        searches: input.searches,
        bookings: input.bookings,
        errors: input.errors,
        price_changes: input.priceChanges,
        sold_outs: input.soldOuts,
        latency_ms: input.latencyMs,
      }),
    );
  }

  async listLedger(id: string) {
    return rows(await this.client.request<unknown>(`${this.base(id)}/ledger?limit=200`)).map(mapLedger);
  }

  async postLedger(id: string, input: LedgerInput) {
    const raw = obj(await this.send<Raw>(`${this.base(id)}/ledger`, "POST", input));
    return { entry: mapLedger(raw.entry), supplier: mapSupplier(obj(raw.supplier)) };
  }

  async routing(product: Product) {
    const raw = obj(await this.client.request<Raw>(`${this.base()}/routing?product=${encodeURIComponent(product)}`));
    return list(raw.options).map(mapRoute);
  }

  async openDispute(id: string, input: DisputeInput) {
    return mapDispute(
      await this.send<Raw>(`${this.base(id)}/disputes`, "POST", {
        title: input.title,
        booking_ref: input.bookingRef,
        amount: input.amount,
        currency: input.currency,
      }),
    );
  }

  async closeDispute(id: string, disputeId: string, status: Exclude<DisputeStatus, "open">, resolution: string) {
    return mapDispute(await this.send<Raw>(`${this.base(id)}/disputes/${encodeURIComponent(disputeId)}`, "PATCH", { status, resolution }));
  }

  async listLinks(supplierId: string) {
    return rows(await this.client.request<unknown>(`${this.base(supplierId)}/links`)).map(mapLink);
  }

  async addLink(supplierId: string, input: CreateLinkInput) {
    return mapLink(
      await this.send<Raw>(`${this.base(supplierId)}/links`, "POST", {
        link_type: input.linkType,
        link_id: input.linkId,
        allotment: input.allotment ?? 0,
        unit_cost: input.unitCost ?? 0,
        currency: input.currency ?? DEFAULT_CURRENCY,
        notes: input.notes ?? "",
      }),
    );
  }

  async deleteLink(supplierId: string, linkId: string) {
    await this.send(`${this.base(supplierId)}/links/${encodeURIComponent(linkId)}`, "DELETE");
  }

  async confirmLink(linkId: string, confirmationRef = "") {
    return mapLink(await this.send<Raw>(`${this.base()}/links/${encodeURIComponent(linkId)}/confirm`, "POST", { confirmation_ref: confirmationRef }));
  }

  async listUnconfirmed() {
    return rows(await this.client.request<unknown>(`${this.base()}/unconfirmed`)).map(mapLink);
  }

  async listOversold() {
    return rows(await this.client.request<unknown>(`${this.base()}/oversold`)).map(mapLink);
  }

  async listInvoices(supplierId: string) {
    return rows(await this.client.request<unknown>(`${this.base(supplierId)}/invoices`)).map(mapInvoice);
  }

  async getInvoice(id: string) {
    return mapInvoice(await this.client.request<Raw>(`${this.base()}/invoices/${encodeURIComponent(id)}`));
  }

  async createInvoice(input: CreateInvoiceInput) {
    const created = mapInvoice(
      await this.send<Raw>(`${this.base()}/invoices`, "POST", {
        supplier_id: input.supplierId,
        invoice_number: input.invoiceNumber,
        currency: input.currency ?? DEFAULT_CURRENCY,
        tax_total: input.taxTotal ?? 0,
        issued_on: dayToTimestamp(input.issueDate),
        due_on: dayToTimestamp(input.dueDate),
        notes: input.notes ?? "",
      }),
    );
    return input.lines?.length ? this.setInvoiceLines(created.id, input.lines) : created;
  }

  async updateInvoiceStatus(id: string, status: SupplierInvoiceStatus) {
    return mapInvoice(await this.send<Raw>(`${this.base()}/invoices/${encodeURIComponent(id)}`, "PATCH", { status }));
  }

  async setInvoiceLines(id: string, lines: InvoiceLineInput[]) {
    return mapInvoice(await this.send<Raw>(`${this.base()}/invoices/${encodeURIComponent(id)}/lines`, "PUT", lines.map(linePayload)));
  }

  async listIssues(supplierId: string) {
    return rows(await this.client.request<unknown>(`${this.base(supplierId)}/issues`)).map(mapIssue);
  }

  async createIssue(supplierId: string, input: CreateIssueInput) {
    return mapIssue(
      await this.send<Raw>(`${this.base(supplierId)}/issues`, "POST", {
        note: input.note,
        kind: input.kind ?? "note",
        severity: input.severity ?? "info",
      }),
    );
  }
}

// --- Offline repository (demo / backend unreachable) ---

let memorySeq = 0;
const memoryId = () => `mem-sup-${++memorySeq}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const hint = (v: string) => (v.length <= 4 ? "••••" : `••••${v.slice(-4)}`);

type MemRow = SupplierListItem & { secrets: Partial<Record<CredentialKey, string>> };

function withState<T extends Supplier>(s: T): T {
  const today = todayIso();
  return { ...s, availability: availabilityOn(s, today), contractDaysLeft: contractDaysLeft(s.contractEnd, today) };
}

function seed(): MemRow[] {
  const now = new Date().toISOString();
  const base = (over: Partial<MemRow>): MemRow =>
    withState({
      id: memoryId(),
      branchId: "",
      code: "",
      nameEn: "",
      nameAr: "",
      category: "other",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      emergencyPhone: "",
      terms: "",
      integration: { type: "manual", environment: "sandbox", apiBaseUrl: "", webhookUrl: "" },
      health: { status: "unknown", latencyMs: 0, checkedAt: null, note: "" },
      finance: { paymentModel: "postpaid", currency: "SAR", depositBalance: 0, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 0, paymentTerms: "net30" },
      markups: {},
      regions: [],
      freeCancelHours: 0,
      contractStart: null,
      contractEnd: null,
      isActive: true,
      availability: { bookable: true, reason: "", warnings: [] },
      contractDaysLeft: null,
      createdAt: now,
      updatedAt: now,
      hasCredentials: false,
      openDisputes: 0,
      spend30d: 0,
      bookings30d: 0,
      secrets: {},
      ...over,
    });
  return [
    base({
      code: "SUP-DUFFEL-01",
      nameEn: "Duffel Financial Ltd",
      category: "gds",
      contactName: "Emma Clarke",
      contactEmail: "partners@duffel.com",
      contactPhone: "+44 20 3966 0000",
      emergencyPhone: "+44 20 3966 0911",
      integration: { type: "api", environment: "production", apiBaseUrl: "https://api.duffel.com", webhookUrl: "https://wcc.example.com/hooks/duffel" },
      health: { status: "active", latencyMs: 320, checkedAt: now, note: "" },
      finance: { paymentModel: "prepaid", currency: "SAR", depositBalance: 12_450_00, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 5_000_00, paymentTerms: "weekly" },
      markups: { flight: 300 },
      regions: ["global"],
      freeCancelHours: 24,
      contractEnd: plusDays(240),
      hasCredentials: true,
      spend30d: 86_200_00,
      bookings30d: 41,
      secrets: { api_key: "duffel_live_7Hq2", account_id: "acc_00093" },
    }),
    base({
      code: "SUP-RATEHAWK",
      nameEn: "RateHawk B2B",
      category: "wholesaler",
      contactName: "Ivan Petrov",
      contactEmail: "b2b@ratehawk.com",
      integration: { type: "api", environment: "production", apiBaseUrl: "https://api.worldota.net", webhookUrl: "" },
      health: { status: "degraded", latencyMs: 1820, checkedAt: now, note: "Slow availability responses" },
      finance: { paymentModel: "postpaid", currency: "USD", depositBalance: 0, creditLimit: 50_000_00, creditUsed: 46_300_00, lowBalanceThreshold: 5_000_00, paymentTerms: "net15" },
      markups: { hotel: 800, package: 1000 },
      regions: ["makkah", "madinah", "europe", "turkey"],
      freeCancelHours: 72,
      contractEnd: plusDays(18),
      hasCredentials: true,
      openDisputes: 1,
      spend30d: 132_800_00,
      bookings30d: 77,
    }),
    base({
      code: "SUP-HAJJ-DMC",
      nameEn: "Al Haram Ground Services",
      nameAr: "خدمات الحرم الأرضية",
      category: "dmc",
      contactName: "Abdullah Al-Harbi",
      contactPhone: "+966 55 120 3344",
      emergencyPhone: "+966 55 120 9911",
      finance: { paymentModel: "prepaid", currency: "SAR", depositBalance: 0, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 10_000_00, paymentTerms: "on_booking" },
      markups: { transfer: 1200, visa: 500, package: 900 },
      regions: ["makkah", "madinah", "jeddah"],
      freeCancelHours: 48,
      contractEnd: plusDays(400),
    }),
    base({
      code: "SUP-SAPTCO",
      nameEn: "SAPTCO Charter",
      category: "transfer",
      contactName: "Fahad Al-Qahtani",
      finance: { paymentModel: "card", currency: "SAR", depositBalance: 0, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 0, paymentTerms: "on_booking" },
      markups: { transfer: 1500 },
      regions: ["saudi"],
      contractEnd: plusDays(-3),
    }),
  ];
}

function applyInput(row: MemRow, input: SupplierInput): MemRow {
  const secrets = { ...row.secrets };
  for (const k of CREDENTIAL_KEYS) {
    const v = input.credentials[k];
    if (v === undefined) continue;
    if (v === "") delete secrets[k];
    else secrets[k] = v;
  }
  return withState({
    ...row,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    category: input.category,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    emergencyPhone: input.emergencyPhone.trim(),
    terms: input.terms.trim(),
    integration: { type: input.integrationType, environment: input.environment, apiBaseUrl: input.apiBaseUrl.trim(), webhookUrl: input.webhookUrl.trim() },
    finance: {
      ...row.finance,
      paymentModel: input.paymentModel,
      currency: input.currency || DEFAULT_CURRENCY,
      creditLimit: input.creditLimit,
      lowBalanceThreshold: input.lowBalanceThreshold,
      paymentTerms: input.paymentTerms,
    },
    markups: Object.fromEntries(Object.entries(input.markups).filter(([, v]) => (v ?? 0) > 0)),
    regions: [...input.regions],
    freeCancelHours: input.freeCancelHours,
    contractStart: input.contractStart || null,
    contractEnd: input.contractEnd || null,
    isActive: input.isActive,
    secrets,
    hasCredentials: Object.keys(secrets).length > 0,
    updatedAt: new Date().toISOString(),
  });
}

function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

function strip(row: MemRow): Supplier {
  return omit(row, ["secrets", "hasCredentials", "openDisputes", "spend30d", "bookings30d"]);
}

export class MemorySupplierRepository implements SupplierRepository {
  private suppliers: MemRow[] = seed();
  private ledger: LedgerEntry[] = [];
  private disputes: Dispute[] = [];
  private metrics = new Map<string, Metrics>();
  private links: SupplierLink[] = [];
  private invoices: SupplierInvoice[] = [];
  private issues: IssueEvent[] = [];

  private row(id: string): MemRow {
    const s = this.suppliers.find((x) => x.id === id);
    if (!s) throw new Error("supplier not found");
    return s;
  }

  private save(row: MemRow) {
    this.suppliers = this.suppliers.map((s) => (s.id === row.id ? row : s));
  }

  async list(filter: SupplierListFilter = {}) {
    const q = filter.q?.trim().toLowerCase() ?? "";
    return this.suppliers
      .map(withState)
      .filter((s) => (!filter.category || s.category === filter.category) && (!filter.activeOnly || s.isActive))
      .filter((s) => !q || [s.code, s.nameEn, s.nameAr, s.contactName, s.contactEmail].join(" ").toLowerCase().includes(q))
      .map((row) => omit(row, ["secrets"]))
      .map((s) => ({ ...s, openDisputes: this.disputes.filter((d) => d.supplierId === s.id && d.status === "open").length + s.openDisputes }));
  }

  async get(id: string): Promise<SupplierDetail> {
    const row = withState(this.row(id));
    const credentials: SupplierDetail["credentials"] = {};
    for (const [k, v] of Object.entries(row.secrets)) if (v) credentials[k as CredentialKey] = hint(v);
    const disputes = this.disputes.filter((d) => d.supplierId === id);
    const m = this.metrics.get(id) ?? { searches: 0, bookings: 0, errors: 0, priceChanges: 0, soldOuts: 0, avgLatencyMs: 0, lookToBook: 0, errorRatePct: 0, failedBookingPct: 0, windowDays: 30 };
    return {
      supplier: strip(row),
      credentials,
      metrics: m,
      volume: { spend: row.spend30d, bookings: row.bookings30d, refunds: 0 },
      ledger: this.ledger.filter((e) => e.supplierId === id),
      canViewLedger: true,
      disputes,
      openDisputes: disputes.filter((d) => d.status === "open").length,
      today: todayIso(),
    };
  }

  async create(input: SupplierInput) {
    const code = input.code.trim().toUpperCase();
    if (this.suppliers.some((s) => s.code === code)) throw new Error("supplier code already exists");
    const now = new Date().toISOString();
    const empty: MemRow = { ...seed()[0], id: memoryId(), code, secrets: {}, hasCredentials: false, spend30d: 0, bookings30d: 0, openDisputes: 0, createdAt: now };
    empty.finance = { ...empty.finance, depositBalance: 0, creditUsed: 0 };
    empty.health = { status: "unknown", latencyMs: 0, checkedAt: null, note: "" };
    const row = applyInput(empty, input);
    this.suppliers = [row, ...this.suppliers];
    return strip(row);
  }

  async update(id: string, input: SupplierInput) {
    const row = applyInput(this.row(id), input);
    this.save(row);
    return strip(row);
  }

  async setActive(id: string, active: boolean) {
    const row = withState({ ...this.row(id), isActive: active });
    this.save(row);
    return strip(row);
  }

  async healthCheck(): Promise<Supplier> {
    throw new Error("health checks need the server");
  }

  async setHealth(id: string, status: HealthStatus, note: string) {
    const row = withState({ ...this.row(id), health: { ...this.row(id).health, status, note, checkedAt: new Date().toISOString() } });
    this.save(row);
    return strip(row);
  }

  async recordUsage(id: string, input: UsageInput) {
    const prev = this.metrics.get(id);
    const searches = (prev?.searches ?? 0) + input.searches;
    const bookings = (prev?.bookings ?? 0) + input.bookings;
    const errors = (prev?.errors ?? 0) + input.errors;
    const priceChanges = (prev?.priceChanges ?? 0) + input.priceChanges;
    const soldOuts = (prev?.soldOuts ?? 0) + input.soldOuts;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const attempts = bookings + priceChanges + soldOuts;
    const m: Metrics = {
      searches,
      bookings,
      errors,
      priceChanges,
      soldOuts,
      avgLatencyMs: input.latencyMs || prev?.avgLatencyMs || 0,
      lookToBook: searches ? round1((bookings * 1000) / searches) : 0,
      errorRatePct: searches ? round1((errors * 100) / searches) : 0,
      failedBookingPct: attempts ? round1(((priceChanges + soldOuts) * 100) / attempts) : 0,
      windowDays: 30,
    };
    this.metrics.set(id, m);
    return m;
  }

  async listLedger(id: string) {
    return this.ledger.filter((e) => e.supplierId === id);
  }

  async postLedger(id: string, input: LedgerInput) {
    const row = this.row(id);
    const res = applyEntry(row.finance, input.kind, input.amount);
    if (!res.ok) throw new Error(`ledger: ${res.error}`);
    const next = withState({ ...row, finance: res.finance });
    this.save(next);
    const entry: LedgerEntry = {
      id: memoryId(),
      supplierId: id,
      kind: input.kind,
      amount: input.amount,
      currency: row.finance.currency,
      balanceAfter: res.balanceAfter,
      reference: input.reference,
      note: input.note,
      actorId: null,
      createdAt: new Date().toISOString(),
    };
    this.ledger = [entry, ...this.ledger];
    return { entry, supplier: strip(next) };
  }

  async routing(product: Product) {
    return rankSuppliers(this.suppliers.map(withState), product, todayIso()).map(({ supplier: s, availability, score, markupBps }) => ({
      supplierId: s.id,
      code: s.code,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      category: s.category,
      availability,
      score,
      markupBps,
      health: s.health.status,
      latencyMs: s.health.latencyMs,
      currency: s.finance.currency,
    }));
  }

  async openDispute(id: string, input: DisputeInput) {
    const d: Dispute = {
      id: memoryId(),
      supplierId: id,
      title: input.title.trim(),
      bookingRef: input.bookingRef.trim(),
      amount: input.amount,
      currency: input.currency || this.row(id).finance.currency,
      status: "open",
      resolution: "",
      openedAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.disputes = [d, ...this.disputes];
    return d;
  }

  async closeDispute(_id: string, disputeId: string, status: Exclude<DisputeStatus, "open">, resolution: string) {
    const d = this.disputes.find((x) => x.id === disputeId);
    if (!d || d.status !== "open") throw new Error("dispute is already closed");
    Object.assign(d, { status, resolution, resolvedAt: new Date().toISOString() });
    return { ...d };
  }

  async listLinks(supplierId: string) {
    return this.links.filter((l) => l.supplierId === supplierId);
  }

  async addLink(supplierId: string, input: CreateLinkInput) {
    const now = new Date().toISOString();
    const l: SupplierLink = {
      id: memoryId(),
      supplierId,
      linkType: input.linkType,
      linkId: input.linkId,
      confirmationStatus: "pending",
      confirmationRef: "",
      confirmedAt: null,
      allotment: input.allotment ?? 0,
      sold: 0,
      unitCost: input.unitCost ?? 0,
      currency: input.currency ?? DEFAULT_CURRENCY,
      notes: input.notes ?? "",
      oversold: false,
      createdAt: now,
      updatedAt: now,
    };
    this.links.push(l);
    return l;
  }

  async deleteLink(_supplierId: string, linkId: string) {
    this.links = this.links.filter((l) => l.id !== linkId);
  }

  async confirmLink(linkId: string, confirmationRef = "") {
    const l = this.links.find((x) => x.id === linkId);
    if (!l) throw new Error("link not found");
    Object.assign(l, { confirmationStatus: "confirmed", confirmationRef, confirmedAt: new Date().toISOString() });
    return { ...l };
  }

  async listUnconfirmed() {
    return this.links.filter((l) => l.confirmationStatus === "pending");
  }

  async listOversold() {
    return this.links.filter((l) => l.oversold);
  }

  async listInvoices(supplierId: string) {
    return this.invoices.filter((i) => i.supplierId === supplierId);
  }

  async getInvoice(id: string) {
    const inv = this.invoices.find((x) => x.id === id);
    if (!inv) throw new Error("invoice not found");
    return inv;
  }

  async createInvoice(input: CreateInvoiceInput) {
    const now = new Date().toISOString();
    const inv: SupplierInvoice = {
      id: memoryId(),
      supplierId: input.supplierId,
      branchId: "",
      invoiceNumber: input.invoiceNumber,
      status: "draft",
      currency: input.currency ?? DEFAULT_CURRENCY,
      issueDate: input.issueDate ?? "",
      dueDate: input.dueDate ?? "",
      notes: input.notes ?? "",
      subtotal: 0,
      taxTotal: input.taxTotal ?? 0,
      total: input.taxTotal ?? 0,
      lines: [],
      createdAt: now,
      updatedAt: now,
    };
    this.invoices = [inv, ...this.invoices];
    return input.lines?.length ? this.setInvoiceLines(inv.id, input.lines) : inv;
  }

  async updateInvoiceStatus(id: string, status: SupplierInvoiceStatus) {
    const inv = await this.getInvoice(id);
    inv.status = status;
    return { ...inv };
  }

  async setInvoiceLines(id: string, lines: InvoiceLineInput[]) {
    const inv = await this.getInvoice(id);
    inv.lines = lines.map((l) => ({ id: memoryId(), description: l.description, quantity: l.quantity, unitCost: l.unitCost, linkId: l.linkId ?? null, lineTotal: l.quantity * l.unitCost }));
    inv.subtotal = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    inv.total = inv.subtotal + inv.taxTotal;
    return { ...inv };
  }

  async listIssues(supplierId: string) {
    return this.issues.filter((i) => i.supplierId === supplierId);
  }

  async createIssue(supplierId: string, input: CreateIssueInput) {
    const issue: IssueEvent = {
      id: memoryId(),
      supplierId,
      kind: input.kind ?? "note",
      severity: input.severity ?? "info",
      note: input.note,
      actorId: null,
      createdAt: new Date().toISOString(),
    };
    this.issues = [issue, ...this.issues];
    return issue;
  }
}

let memory: MemorySupplierRepository | null = null;

export function createSupplierRepository(client: HttpClient = http): SupplierRepository {
  memory ??= new MemorySupplierRepository();
  return createRepository<SupplierRepository>({
    api: new ApiSupplierRepository(client),
    memory,
    reads: ["list", "get", "listLedger", "routing", "listLinks", "listUnconfirmed", "listOversold", "listInvoices", "getInvoice", "listIssues"],
  });
}
