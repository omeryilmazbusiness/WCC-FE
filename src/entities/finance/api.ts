import { http, type HttpClient, type HttpMethod } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import { bucketOf, emptyBuckets, riskOf, settleRefund, shares } from "./lib/calc";
import {
  ACCOUNT_KINDS,
  AGENCY_STATUSES,
  AGEING_BUCKETS,
  BSP_STATUSES,
  BSP_TYPES,
  MATCH_STATUSES,
  MOVEMENT_KINDS,
  RISK_LEVELS,
  type Account,
  type AccountInput,
  type Agency,
  type AgencyInput,
  type AgencyStatus,
  type Ageing,
  type AgeingBucket,
  type BspDetail,
  type BspImportInput,
  type BspLine,
  type BspStatement,
  type Budget,
  type Converted,
  type DepartureProfit,
  type Exposure,
  type FeedResult,
  type FeedRow,
  type FinanceSettings,
  type Letter,
  type LetterParty,
  type MonthFigure,
  type Movement,
  type MovementInput,
  type Overview,
  type Payables,
  type PnL,
  type PosStat,
  type Profitability,
  type PublicLetter,
  type Receivables,
  type RefundQuote,
  type RefundQuoteInput,
  type TransferInput,
} from "./model";

export interface FinanceRepository {
  overview(): Promise<Overview>;

  accounts(): Promise<Account[]>;
  createAccount(input: AccountInput): Promise<Account>;
  updateAccount(id: string, input: AccountInput): Promise<Account>;
  postMovement(accountId: string, input: MovementInput): Promise<{ movement: Movement; account: Account }>;
  transfer(input: TransferInput): Promise<Movement[]>;
  movements(filter?: { accountId?: string; unmatched?: boolean }): Promise<Movement[]>;
  importFeed(accountId: string, rows: FeedRow[]): Promise<FeedResult>;
  matchMovement(id: string, bookingId: string): Promise<Movement>;
  ignoreMovement(id: string): Promise<void>;
  posStats(): Promise<PosStat[]>;

  receivables(): Promise<Receivables>;
  createAgency(input: AgencyInput): Promise<Agency>;
  updateAgency(id: string, input: AgencyInput): Promise<Agency>;
  setAgencyStatus(id: string, status: AgencyStatus): Promise<Agency>;
  assignBooking(agencyId: string, bookingId: string): Promise<void>;
  unassignBooking(bookingId: string): Promise<void>;

  payables(): Promise<Payables>;
  payInvoice(invoiceId: string, input: { accountId: string; fee: number; note: string }): Promise<Movement>;
  topUp(supplierId: string, input: { accountId: string; amount: number; fee: number; reference: string }): Promise<Movement>;

  profitability(range?: { from?: string; to?: string }): Promise<Profitability>;
  setBudget(departureId: string, input: { currency: string; revenue: number; cost: number; note: string }): Promise<Budget>;
  settings(): Promise<FinanceSettings>;
  setRates(input: { commissionBps: number }): Promise<FinanceSettings>;


  statements(): Promise<BspStatement[]>;
  statement(id: string): Promise<BspDetail>;
  importStatement(input: BspImportInput): Promise<BspDetail>;
  quoteRefund(input: RefundQuoteInput): Promise<RefundQuote>;
  letters(): Promise<Letter[]>;
  createLetter(input: { partyType: LetterParty; partyId: string; email: string }): Promise<Letter>;
}

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj) : []);
const optStr = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const optNum = (v: unknown): number | null => (v == null ? null : num(v));
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => ((allowed as readonly string[]).includes(str(v)) ? (str(v) as T) : d);

function mapConverted(v: unknown): Converted {
  const c = obj(v);
  return { items: list(c.items).map((m) => ({ currency: str(m.currency), amount: num(m.amount), count: num(m.count) })), total: num(c.total), partial: c.partial === true };
}

function mapMonth(v: unknown): MonthFigure {
  const m = obj(v);
  return { month: str(m.month), revenue: num(m.revenue), margin: num(m.margin), bookings: num(m.bookings), partial: m.partial === true };
}

export function mapOverview(raw: Raw): Overview {
  const a = obj(raw.alerts);
  return {
    reportingCurrency: str(raw.reporting_currency, "SAR"),
    cash: mapConverted(raw.cash),
    receivables: mapConverted(raw.receivables),
    payables: mapConverted(raw.payables),
    deposits: mapConverted(raw.deposits),
    netPosition: num(raw.net_position),
    month: mapMonth(raw.month),
    monthMarginBps: num(raw.month_margin_bps),
    trend: list(raw.trend).map(mapMonth),
    exposure: list(raw.exposure).map((s) => ({
      currency: str(s.currency),
      amount: num(s.amount),
      converted: num(s.converted),
      shareBps: num(s.share_bps),
      unconverted: s.unconverted === true,
    })),
    alerts: {
      lowDeposits: num(a.low_deposits),
      lowAccounts: num(a.low_accounts),
      unmatchedCredits: num(a.unmatched_credits),
      pendingRefunds: num(a.pending_refunds),
      suspendedAgencies: num(a.suspended_agencies),
      overdueSchedules: num(a.overdue_schedules),
      supplierDueSoon: num(a.supplier_due_soon),
    },
    asOf: str(raw.as_of),
  };
}

export function mapAccount(r: Raw): Account {
  return {
    id: str(r.id),
    branchId: str(r.branch_id),
    kind: pick(r.kind, ACCOUNT_KINDS, "bank"),
    name: str(r.name),
    currency: str(r.currency),
    bankName: str(r.bank_name),
    iban: str(r.iban),
    commissionBps: num(r.commission_bps),
    balance: num(r.balance),
    lowBalanceThreshold: num(r.low_balance_threshold),
    lowBalance: r.low_balance === true,
    isActive: r.is_active !== false,
    createdAt: str(r.created_at),
  };
}

export function mapMovement(r: Raw): Movement {
  return {
    id: str(r.id),
    accountId: str(r.account_id),
    direction: r.direction === "out" ? "out" : "in",
    kind: pick(r.kind, MOVEMENT_KINDS, "adjustment"),
    amount: num(r.amount),
    fee: num(r.fee),
    net: num(r.net),
    currency: str(r.currency),
    balanceAfter: num(r.balance_after),
    bookingId: optStr(r.booking_id),
    supplierId: optStr(r.supplier_id),
    source: r.source === "bank_feed" ? "bank_feed" : "manual",
    externalId: str(r.external_id),
    reference: str(r.reference),
    counterparty: str(r.counterparty),
    note: str(r.note),
    matchStatus: pick(r.match_status, MATCH_STATUSES, "na"),
    occurredOn: str(r.occurred_on).slice(0, 10),
    createdAt: str(r.created_at),
  };
}

function mapExposure(v: unknown): Exposure {
  const e = obj(v);
  return {
    outstanding: num(e.outstanding),
    overdue: num(e.overdue),
    oldestOverdueDays: num(e.oldest_overdue_days),
    openBookings: num(e.open_bookings),
    unconvertedBalance: e.unconverted_balance === true,
  };
}

export function mapAgency(r: Raw): Agency {
  const risk = obj(r.risk);
  return {
    id: str(r.id),
    branchId: str(r.branch_id),
    code: str(r.code),
    name: str(r.name),
    contactName: str(r.contact_name),
    phone: str(r.phone),
    email: str(r.email),
    taxId: str(r.tax_id),
    currency: str(r.currency),
    creditLimit: num(r.credit_limit),
    paymentTermsDays: num(r.payment_terms_days),
    graceDays: num(r.grace_days),
    autoSuspend: r.auto_suspend !== false,
    status: pick(r.status, AGENCY_STATUSES, "active"),
    suspendReason: str(r.suspend_reason),
    exposure: mapExposure(r.exposure),
    risk: { available: num(risk.available, num(r.credit_limit)), usedPct: num(risk.used_pct), level: pick(risk.level, RISK_LEVELS, "ok") },
  };
}

function mapBuckets(v: unknown): Record<AgeingBucket, number> {
  const b = obj(v);
  return Object.fromEntries(AGEING_BUCKETS.map((k) => [k, num(b[k])])) as Record<AgeingBucket, number>;
}

export function mapReceivables(raw: Raw): Receivables {
  return {
    ageing: list(raw.ageing).map(
      (a): Ageing => ({ currency: str(a.currency), buckets: mapBuckets(a.buckets), counts: mapBuckets(a.counts), total: num(a.total), overdue: num(a.overdue) }),
    ),
    debtors: list(raw.debtors).map((d) => ({
      bookingId: str(d.booking_id),
      refNo: num(d.ref_no),
      customerName: str(d.customer_name),
      phone: str(d.phone),
      agencyId: optStr(d.agency_id),
      agencyName: str(d.agency_name),
      currency: str(d.currency),
      balance: num(d.balance),
      dueOn: optStr(d.due_on),
      daysLate: num(d.days_late),
    })),
    agencies: list(raw.agencies).map(mapAgency),
  };
}

export function mapPayables(raw: Raw): Payables {
  return {
    suppliers: list(raw.suppliers).map((s) => ({
      id: str(s.id),
      code: str(s.code),
      name: str(s.name),
      isActive: s.is_active !== false,
      paymentModel: pick(s.payment_model, ["prepaid", "postpaid", "card"] as const, "postpaid"),
      currency: str(s.currency),
      depositBalance: num(s.deposit_balance),
      creditLimit: num(s.credit_limit),
      creditUsed: num(s.credit_used),
      lowBalanceThreshold: num(s.low_balance_threshold),
      openDisputes: num(s.open_disputes),
    })),
    plan: list(raw.plan).map((d) => ({
      id: str(d.id),
      supplierId: str(d.supplier_id),
      supplierName: str(d.supplier_name),
      invoiceNumber: str(d.invoice_number),
      status: str(d.status),
      currency: str(d.currency),
      amount: num(d.amount),
      dueOn: optStr(d.due_on),
    })),
    today: str(raw.today),
  };
}

function mapPnL(v: unknown): PnL {
  const p = obj(v);
  return {
    gross: num(p.gross),
    net: num(p.net),
    tax: num(p.tax),
    fee: num(p.fee),
    costed: p.costed === true,
    revenue: num(p.revenue),
    margin: num(p.margin),
    marginBps: num(p.margin_bps),
  };
}

function mapBudget(v: unknown): Budget | null {
  if (!v || typeof v !== "object") return null;
  const b = obj(v);
  return { departureId: str(b.departure_id), currency: str(b.currency), revenue: num(b.revenue), cost: num(b.cost), margin: num(b.margin), note: str(b.note) };
}

export function mapProfitability(raw: Raw): Profitability {
  return {
    from: str(raw.from),
    to: str(raw.to),
    commissionBps: num(raw.commission_bps),
    bookings: list(raw.bookings).map((b) => ({
      bookingId: str(b.booking_id),
      refNo: num(b.ref_no),
      customerName: str(b.customer_name),
      ownerName: str(b.owner_name),
      serviceType: str(b.service_type),
      status: str(b.status),
      currency: str(b.currency),
      pnl: mapPnL(b.pnl),
      createdAt: str(b.created_at),
    })),
    departures: list(raw.departures).map((d): DepartureProfit => {
      const v = d.variance ? obj(d.variance) : null;
      return {
        departureId: str(d.departure_id),
        packageName: str(d.package_name),
        departsOn: optStr(d.departs_on),
        currency: str(d.currency),
        bookings: num(d.bookings),
        pax: num(d.pax),
        pnl: mapPnL(d.pnl),
        budget: mapBudget(d.budget),
        variance: v ? { revenue: num(v.revenue), cost: num(v.cost), margin: num(v.margin), costOverrun: v.cost_overrun === true } : null,
      };
    }),
    reps: list(raw.reps).map((r) => ({
      userId: str(r.user_id),
      name: str(r.name),
      currency: str(r.currency),
      bookings: num(r.bookings),
      uncosted: num(r.uncosted),
      pnl: mapPnL(r.pnl),
      commission: num(r.commission),
    })),
  };
}

function mapSettings(r: Raw): FinanceSettings {
  return {
    reportingCurrency: str(r.reporting_currency, "SAR"),
    commissionBps: num(r.commission_bps, 1000),
  };
}

export function mapStatement(r: Raw): BspStatement {
  return {
    id: str(r.id),
    label: str(r.label),
    periodStart: str(r.period_start),
    periodEnd: str(r.period_end),
    currency: str(r.currency),
    total: num(r.total),
    systemTotal: num(r.system_total),
    difference: num(r.difference),
    lineCount: num(r.line_count),
    matched: num(r.matched),
    mismatched: num(r.mismatched),
    missingSystem: num(r.missing_system),
    missingBsp: num(r.missing_bsp),
    createdAt: str(r.created_at),
  };
}

function mapBspLine(l: Raw): BspLine {
  return {
    id: str(l.id),
    documentNo: str(l.document_no),
    pnr: str(l.pnr),
    type: pick(l.type, BSP_TYPES, "sale"),
    passenger: str(l.passenger),
    issuedOn: optStr(l.issued_on),
    amount: num(l.amount),
    bookingId: optStr(l.booking_id),
    systemAmount: optNum(l.system_amount),
    status: pick(l.status, BSP_STATUSES, "matched"),
  };
}

export function mapStatementDetail(r: Raw): BspDetail {
  return { ...mapStatement(r), lines: list(r.lines).map(mapBspLine) };
}

export function mapLetter(r: Raw): Letter {
  return {
    id: str(r.id),
    partyType: r.party_type === "supplier" ? "supplier" : "agency",
    partyId: str(r.party_id),
    partyName: str(r.party_name),
    periodEnd: str(r.period_end),
    balance: num(r.balance),
    currency: str(r.currency),
    email: str(r.email),
    status: pick(r.status, ["sent", "confirmed", "disputed", "expired"] as const, "sent"),
    responseNote: str(r.response_note),
    respondedBy: str(r.responded_by),
    respondedAt: optStr(r.responded_at),
    expiresAt: str(r.expires_at),
    createdAt: str(r.created_at),
    ...(typeof r.token === "string" ? { token: r.token } : {}),
  };
}

export function mapPublicLetter(r: Raw): PublicLetter {
  return {
    company: str(r.company),
    partyType: r.party_type === "supplier" ? "supplier" : "agency",
    partyName: str(r.party_name),
    periodEnd: str(r.period_end),
    balance: num(r.balance),
    currency: str(r.currency),
    status: pick(r.status, ["sent", "confirmed", "disputed", "expired"] as const, "sent"),
    responseNote: str(r.response_note),
    respondedBy: str(r.responded_by),
    respondedAt: optStr(r.responded_at),
    expiresAt: str(r.expires_at),
  };
}

export function mapRefundQuote(r: Raw): RefundQuote {
  const i = obj(r.input);
  const s = obj(r.settlement);
  return {
    bookingId: optStr(r.booking_id),
    currency: str(r.currency),
    input: { paid: num(i.paid), supplierCost: num(i.supplier_cost), supplierPenalty: num(i.supplier_penalty), serviceFee: num(i.service_fee) },
    settlement: {
      customerRefund: num(s.customer_refund),
      supplierRefund: num(s.supplier_refund),
      retained: num(s.retained),
      agencyResult: num(s.agency_result),
      shortfall: num(s.shortfall),
    },
  };
}

const accountPayload = (i: AccountInput) => ({
  kind: i.kind,
  name: i.name.trim(),
  currency: i.currency,
  bank_name: i.bankName.trim(),
  iban: i.iban.replace(/\s/g, "").toUpperCase(),
  commission_bps: i.commissionBps,
  low_balance_threshold: i.lowBalanceThreshold,
  is_active: i.isActive ?? true,
  opening_balance: i.openingBalance ?? 0,
});

const agencyPayload = (i: AgencyInput) => ({
  code: i.code.trim().toUpperCase(),
  name: i.name.trim(),
  contact_name: i.contactName.trim(),
  phone: i.phone.trim(),
  email: i.email.trim(),
  tax_id: i.taxId.trim(),
  currency: i.currency,
  credit_limit: i.creditLimit,
  payment_terms_days: i.paymentTermsDays,
  grace_days: i.graceDays,
  auto_suspend: i.autoSuspend,
});

const enc = encodeURIComponent;

export class ApiFinanceRepository implements FinanceRepository {
  constructor(private readonly client: HttpClient) {}

  private get<T = Raw>(path: string) {
    return this.client.request<T>(`/finance${path}`);
  }

  private send<T = Raw>(path: string, method: HttpMethod, body?: unknown) {
    return this.client.request<T>(`/finance${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async overview() {
    return mapOverview(await this.get("/overview"));
  }

  async accounts() {
    return list(await this.get<unknown>("/treasury/accounts")).map(mapAccount);
  }

  async createAccount(input: AccountInput) {
    return mapAccount(await this.send("/treasury/accounts", "POST", accountPayload(input)));
  }

  async updateAccount(id: string, input: AccountInput) {
    return mapAccount(await this.send(`/treasury/accounts/${enc(id)}`, "PUT", accountPayload(input)));
  }

  async postMovement(accountId: string, i: MovementInput) {
    const r = await this.send(`/treasury/accounts/${enc(accountId)}/movements`, "POST", {
      direction: i.direction,
      kind: i.kind,
      amount: i.amount,
      fee: i.fee ?? null,
      booking_id: i.bookingId ?? null,
      reference: i.reference.trim(),
      counterparty: i.counterparty.trim(),
      note: i.note.trim(),
      occurred_on: i.occurredOn,
    });
    return { movement: mapMovement(obj(r.movement)), account: mapAccount(obj(r.account)) };
  }

  async transfer(i: TransferInput) {
    const r = await this.send<unknown>("/treasury/transfers", "POST", {
      from_account_id: i.fromAccountId,
      to_account_id: i.toAccountId,
      amount: i.amount,
      fee: i.fee,
      note: i.note.trim(),
      occurred_on: i.occurredOn,
    });
    return list(r).map(mapMovement);
  }

  async movements(filter: { accountId?: string; unmatched?: boolean } = {}) {
    const q = new URLSearchParams();
    if (filter.accountId) q.set("account_id", filter.accountId);
    if (filter.unmatched) q.set("unmatched", "true");
    const qs = q.toString();
    return list(await this.get<unknown>(`/treasury/movements${qs ? `?${qs}` : ""}`)).map(mapMovement);
  }

  async importFeed(accountId: string, rows: FeedRow[]) {
    const r = await this.send(`/treasury/accounts/${enc(accountId)}/feed`, "POST", {
      rows: rows.map((x) => ({ external_id: x.externalId, occurred_on: x.occurredOn, amount: x.amount, direction: x.direction, description: x.description, counterparty: x.counterparty })),
    });
    return { imported: num(r.imported), duplicates: num(r.duplicates), autoMatched: num(r.auto_matched), unmatched: num(r.unmatched) };
  }

  async matchMovement(id: string, bookingId: string) {
    return mapMovement(await this.send(`/treasury/movements/${enc(id)}/match`, "POST", { booking_id: bookingId }));
  }

  async ignoreMovement(id: string) {
    await this.send(`/treasury/movements/${enc(id)}/ignore`, "POST");
  }

  async posStats() {
    return list(await this.get<unknown>("/treasury/pos-stats")).map((s) => ({
      accountId: str(s.account_id),
      name: str(s.name),
      currency: str(s.currency),
      commissionBps: num(s.commission_bps),
      gross: num(s.gross),
      fees: num(s.fees),
      net: num(s.net),
      count: num(s.count),
      effectiveBps: num(s.effective_bps),
    }));
  }

  async receivables() {
    return mapReceivables(await this.get("/receivables"));
  }

  async createAgency(input: AgencyInput) {
    return mapAgency(await this.send("/agencies", "POST", agencyPayload(input)));
  }

  async updateAgency(id: string, input: AgencyInput) {
    return mapAgency(await this.send(`/agencies/${enc(id)}`, "PUT", agencyPayload(input)));
  }

  async setAgencyStatus(id: string, status: AgencyStatus) {
    return mapAgency(await this.send(`/agencies/${enc(id)}/status`, "PUT", { status }));
  }

  async assignBooking(agencyId: string, bookingId: string) {
    await this.send(`/agencies/${enc(agencyId)}/bookings/${enc(bookingId)}`, "PUT");
  }

  async unassignBooking(bookingId: string) {
    await this.send(`/agency-bookings/${enc(bookingId)}`, "DELETE");
  }

  async payables() {
    return mapPayables(await this.get("/payables"));
  }

  async payInvoice(invoiceId: string, i: { accountId: string; fee: number; note: string }) {
    return mapMovement(await this.send(`/payables/invoices/${enc(invoiceId)}/pay`, "POST", { account_id: i.accountId, fee: i.fee, note: i.note.trim() }));
  }

  async topUp(supplierId: string, i: { accountId: string; amount: number; fee: number; reference: string }) {
    return mapMovement(
      await this.send(`/payables/suppliers/${enc(supplierId)}/top-up`, "POST", { account_id: i.accountId, amount: i.amount, fee: i.fee, reference: i.reference.trim() }),
    );
  }

  async profitability(range: { from?: string; to?: string } = {}) {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    const qs = q.toString();
    return mapProfitability(await this.get(`/profitability${qs ? `?${qs}` : ""}`));
  }

  async setBudget(departureId: string, i: { currency: string; revenue: number; cost: number; note: string }) {
    return mapBudget(await this.send(`/budgets/${enc(departureId)}`, "PUT", { currency: i.currency, revenue: i.revenue, cost: i.cost, note: i.note.trim() })) as Budget;
  }

  async settings() {
    return mapSettings(await this.get("/settings"));
  }

  async setRates(i: { commissionBps: number }) {
    return mapSettings(await this.send("/settings/rates", "PUT", { commission_bps: i.commissionBps }));
  }

  async statements() {
    return list(await this.get<unknown>("/bsp")).map(mapStatement);
  }

  async statement(id: string) {
    return mapStatementDetail(await this.get(`/bsp/${enc(id)}`));
  }

  async importStatement(i: BspImportInput) {
    return mapStatementDetail(
      await this.send("/bsp", "POST", {
        label: i.label.trim(),
        period_start: i.periodStart,
        period_end: i.periodEnd,
        currency: i.currency,
        lines: i.lines.map((l) => ({ document_no: l.documentNo, pnr: l.pnr, type: l.type, passenger: l.passenger, issued_on: l.issuedOn, amount: l.amount })),
      }),
    );
  }

  async quoteRefund(i: RefundQuoteInput) {
    return mapRefundQuote(
      await this.send("/refunds/quote", "POST", {
        booking_id: i.bookingId ?? null,
        currency: i.currency ?? "",
        paid: i.paid ?? null,
        supplier_cost: i.supplierCost ?? null,
        supplier_penalty: i.supplierPenalty,
        service_fee: i.serviceFee,
      }),
    );
  }

  async letters() {
    return list(await this.get<unknown>("/letters")).map(mapLetter);
  }

  async createLetter(i: { partyType: LetterParty; partyId: string; email: string }) {
    return mapLetter(await this.send("/letters", "POST", { party_type: i.partyType, party_id: i.partyId, email: i.email.trim() }));
  }
}

// ---- demo twin (read-only: writes always need the server) ----

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const serverOnly = (): never => {
  throw new Error("finance changes need the server");
};

function demoAccounts(): Account[] {
  const base = { branchId: "demo", bankName: "", iban: "", commissionBps: 0, lowBalanceThreshold: 0, lowBalance: false, isActive: true, createdAt: "" };
  return [
    { ...base, id: "acc-rajhi", kind: "bank", name: "Al Rajhi · SAR", currency: "SAR", bankName: "Al Rajhi Bank", iban: "SA0380000000608010167519", balance: 184_250_00 },
    { ...base, id: "acc-ziraat", kind: "bank", name: "Ziraat · TRY", currency: "TRY", bankName: "Ziraat Bankası", iban: "TR330006100519786457841326", balance: 1_265_400_00 },
    { ...base, id: "acc-usd", kind: "bank", name: "Emirates NBD · USD", currency: "USD", bankName: "Emirates NBD", balance: 42_800_00, lowBalanceThreshold: 50_000_00, lowBalance: true },
    { ...base, id: "acc-till-sar", kind: "cash", name: "Makkah office till", currency: "SAR", balance: 12_400_00 },
    { ...base, id: "acc-till-eur", kind: "cash", name: "Istanbul till · EUR", currency: "EUR", balance: 3_150_00 },
    { ...base, id: "acc-pos", kind: "pos", name: "Virtual POS · iyzico", currency: "TRY", commissionBps: 249, balance: 318_900_00 },
  ];
}

function demoAgencies(): Agency[] {
  const mk = (id: string, code: string, name: string, currency: string, limit: number, outstanding: number, overdue: number, days: number, status: AgencyStatus = "active"): Agency => {
    const exposure = { outstanding, overdue, oldestOverdueDays: days, openBookings: outstanding ? 3 : 0, unconvertedBalance: false };
    const a = { id, branchId: "demo", code, name, contactName: "", phone: "", email: "", taxId: "", currency, creditLimit: limit, paymentTermsDays: 15, graceDays: 7, autoSuspend: true, status, suspendReason: status === "suspended" ? "overdue" : "" };
    return { ...a, exposure, risk: riskOf(a, exposure) };
  };
  return [
    mk("ag-1", "NOOR", "Noor Travel", "SAR", 250_000_00, 92_000_00, 0, 0),
    mk("ag-2", "ZEM", "Zemzem Turizm", "TRY", 1_500_000_00, 1_180_000_00, 240_000_00, 12),
    mk("ag-3", "HIJ", "Hijaz Partners", "USD", 60_000_00, 58_500_00, 31_000_00, 34, "suspended"),
  ];
}

export class MemoryFinanceRepository implements FinanceRepository {
  private accountsList = demoAccounts();
  private agencyList = demoAgencies();

  async overview(): Promise<Overview> {
    const fx: Record<string, number> = { SAR: 1, USD: 3.75, EUR: 4.05, TRY: 0.11 };
    const cashBy = new Map<string, number>();
    for (const a of this.accountsList) cashBy.set(a.currency, (cashBy.get(a.currency) ?? 0) + a.balance);
    const items = [...cashBy].map(([currency, amount]) => ({ currency, amount, count: 1 }));
    const conv = (m: { currency: string; amount: number }) => Math.round(m.amount * (fx[m.currency] ?? 0));
    const cash = { items, total: items.reduce((s, m) => s + conv(m), 0), partial: false };
    const recItems = [
      { currency: "SAR", amount: 286_400_00, count: 41 },
      { currency: "TRY", amount: 1_180_000_00, count: 9 },
    ];
    const receivables = { items: recItems, total: recItems.reduce((s, m) => s + conv(m), 0), partial: false };
    const payables = { items: [{ currency: "USD", amount: 38_250_00, count: 4 }], total: conv({ currency: "USD", amount: 38_250_00 }), partial: false };
    const deposits = { items: [{ currency: "USD", amount: 18_900_00, count: 3 }], total: conv({ currency: "USD", amount: 18_900_00 }), partial: false };
    const now = new Date();
    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const revenue = [412, 455, 398, 521, 610, 574][i] * 1_000_00;
      return { month: d.toISOString().slice(0, 7), revenue, margin: Math.round(revenue * [0.14, 0.15, 0.12, 0.16, 0.18, 0.17][i]), bookings: [38, 41, 35, 47, 56, 52][i], partial: false };
    });
    const month = trend[5];
    return {
      reportingCurrency: "SAR",
      cash,
      receivables,
      payables,
      deposits,
      netPosition: receivables.total - payables.total,
      month,
      monthMarginBps: Math.round((month.margin * 10_000) / month.revenue),
      trend,
      exposure: shares(items.map((m) => ({ currency: m.currency, amount: m.amount, converted: conv(m), unconverted: false }))),
      alerts: { lowDeposits: 1, lowAccounts: 1, unmatchedCredits: 2, pendingRefunds: 1, suspendedAgencies: 1, overdueSchedules: 6, supplierDueSoon: 3 },
      asOf: new Date().toISOString(),
    };
  }

  async accounts() {
    return this.accountsList;
  }

  async movements(filter: { accountId?: string; unmatched?: boolean } = {}): Promise<Movement[]> {
    const d = today();
    const base = { fee: 0, balanceAfter: 0, supplierId: null, note: "", createdAt: "" };
    const rows: Movement[] = [
      { ...base, id: "mv-1", accountId: "acc-rajhi", direction: "in", kind: "collection", amount: 12_500_00, net: 12_500_00, currency: "SAR", bookingId: null, source: "bank_feed", externalId: "TRX-88213", reference: "", counterparty: "AHMED AL HARBI", matchStatus: "unmatched", occurredOn: d },
      { ...base, id: "mv-2", accountId: "acc-ziraat", direction: "in", kind: "collection", amount: 84_000_00, net: 84_000_00, currency: "TRY", bookingId: null, source: "bank_feed", externalId: "ZRT-55102", reference: "EFT BK-000231 umre", counterparty: "MEHMET YILMAZ", matchStatus: "unmatched", occurredOn: addDays(d, -1) },
      { ...base, id: "mv-3", accountId: "acc-rajhi", direction: "in", kind: "collection", amount: 9_800_00, net: 9_800_00, currency: "SAR", bookingId: "demo-b1", source: "bank_feed", externalId: "TRX-88190", reference: "WCC-212", counterparty: "SARA K.", matchStatus: "matched", occurredOn: addDays(d, -1) },
      { ...base, id: "mv-4", accountId: "acc-usd", direction: "out", kind: "supplier_payment", amount: 15_000_00, net: 15_000_00, currency: "USD", bookingId: null, source: "manual", externalId: "", reference: "Duffel top-up", counterparty: "Duffel", matchStatus: "na", occurredOn: addDays(d, -2) },
    ];
    return rows.filter((m) => (!filter.accountId || m.accountId === filter.accountId) && (!filter.unmatched || m.matchStatus === "unmatched"));
  }

  async posStats(): Promise<PosStat[]> {
    return [{ accountId: "acc-pos", name: "Virtual POS · iyzico", currency: "TRY", commissionBps: 249, gross: 642_000_00, fees: 15_986_00, net: 626_014_00, count: 118, effectiveBps: 249 }];
  }

  async receivables(): Promise<Receivables> {
    const d = today();
    const debtors = [
      { bookingId: "demo-b2", refNo: 231, customerName: "Mehmet Yılmaz", phone: "+905321112233", agencyId: "ag-2", agencyName: "Zemzem Turizm", currency: "TRY", balance: 240_000_00, dueOn: addDays(d, -12), daysLate: 12 },
      { bookingId: "demo-b3", refNo: 198, customerName: "Hijaz group 14 pax", phone: "", agencyId: "ag-3", agencyName: "Hijaz Partners", currency: "USD", balance: 31_000_00, dueOn: addDays(d, -34), daysLate: 34 },
      { bookingId: "demo-b4", refNo: 244, customerName: "Abdullah Saeed", phone: "+966501234567", agencyId: null, agencyName: "", currency: "SAR", balance: 18_600_00, dueOn: addDays(d, -4), daysLate: 4 },
      { bookingId: "demo-b5", refNo: 251, customerName: "Fatima Noor", phone: "+966555000111", agencyId: null, agencyName: "", currency: "SAR", balance: 7_250_00, dueOn: addDays(d, 6), daysLate: 0 },
    ];
    const byCur = new Map<string, Ageing>();
    for (const x of debtors) {
      const a = byCur.get(x.currency) ?? { currency: x.currency, buckets: emptyBuckets(), counts: emptyBuckets(), total: 0, overdue: 0 };
      const b = bucketOf(x.dueOn, d);
      a.buckets[b] += x.balance;
      a.counts[b] += 1;
      a.total += x.balance;
      if (b !== "current" && b !== "unscheduled") a.overdue += x.balance;
      byCur.set(x.currency, a);
    }
    return { ageing: [...byCur.values()], debtors, agencies: this.agencyList };
  }

  async payables(): Promise<Payables> {
    const d = today();
    return {
      today: d,
      suppliers: [
        { id: "sup-duffel", code: "DUFFEL", name: "Duffel", isActive: true, paymentModel: "prepaid", currency: "USD", depositBalance: 820_00, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 1_000_00, openDisputes: 0 },
        { id: "sup-ratehawk", code: "RATEHAWK", name: "RateHawk B2B", isActive: true, paymentModel: "prepaid", currency: "USD", depositBalance: 14_300_00, creditLimit: 0, creditUsed: 0, lowBalanceThreshold: 5_000_00, openDisputes: 0 },
        { id: "sup-amadeus", code: "AMADEUS", name: "Amadeus", isActive: true, paymentModel: "postpaid", currency: "USD", depositBalance: 0, creditLimit: 100_000_00, creditUsed: 38_250_00, lowBalanceThreshold: 0, openDisputes: 1 },
        { id: "sup-dmc", code: "MKK-DMC", name: "Makkah Ground DMC", isActive: true, paymentModel: "postpaid", currency: "SAR", depositBalance: 0, creditLimit: 400_000_00, creditUsed: 126_000_00, lowBalanceThreshold: 0, openDisputes: 0 },
      ],
      plan: [
        { id: "inv-1", supplierId: "sup-dmc", supplierName: "Makkah Ground DMC", invoiceNumber: "DMC-2291", status: "approved", currency: "SAR", amount: 64_000_00, dueOn: addDays(d, -1) },
        { id: "inv-2", supplierId: "sup-amadeus", supplierName: "Amadeus", invoiceNumber: "AMA-10/26", status: "approved", currency: "USD", amount: 22_100_00, dueOn: addDays(d, 3) },
        { id: "inv-3", supplierId: "sup-dmc", supplierName: "Makkah Ground DMC", invoiceNumber: "DMC-2304", status: "submitted", currency: "SAR", amount: 62_000_00, dueOn: addDays(d, 11) },
      ],
    };
  }

  async profitability(): Promise<Profitability> {
    const pnl = (gross: number, net: number, tax = 0): PnL => {
      const revenue = gross - tax;
      const margin = net > 0 ? revenue - net : 0;
      return { gross, net, tax, fee: 0, costed: net > 0, revenue, margin, marginBps: revenue ? Math.round((margin * 10_000) / revenue) : 0 };
    };
    const d = today();
    return {
      from: `${d.slice(0, 7)}-01`,
      to: d,
      commissionBps: 1000,
      bookings: [
        { bookingId: "demo-b2", refNo: 231, customerName: "Mehmet Yılmaz", ownerName: "Ayşe", serviceType: "package", status: "partially_paid", currency: "SAR", pnl: pnl(42_000_00, 35_200_00), createdAt: d },
        { bookingId: "demo-b4", refNo: 244, customerName: "Abdullah Saeed", ownerName: "Omar", serviceType: "flight", status: "confirmed", currency: "SAR", pnl: pnl(6_400_00, 5_900_00), createdAt: d },
        { bookingId: "demo-b6", refNo: 252, customerName: "Leila H.", ownerName: "Omar", serviceType: "hotel", status: "confirmed", currency: "SAR", pnl: pnl(3_200_00, 0), createdAt: d },
      ],
      departures: [
        {
          departureId: "dep-1",
          packageName: "Ramadan Umrah 15 nights",
          departsOn: addDays(d, 20),
          currency: "SAR",
          bookings: 38,
          pax: 76,
          pnl: pnl(912_000_00, 781_000_00),
          budget: { departureId: "dep-1", currency: "SAR", revenue: 950_000_00, cost: 760_000_00, margin: 190_000_00, note: "" },
          variance: { revenue: -38_000_00, cost: 21_000_00, margin: -59_000_00, costOverrun: true },
        },
        { departureId: "dep-2", packageName: "Hajj 2027 · VIP", departsOn: addDays(d, 210), currency: "USD", bookings: 12, pax: 12, pnl: pnl(186_000_00, 0), budget: null, variance: null },
      ],
      reps: [
        { userId: "u1", name: "Ayşe", currency: "SAR", bookings: 14, uncosted: 1, pnl: pnl(318_000_00, 268_000_00), commission: 5_000_00 },
        { userId: "u2", name: "Omar", currency: "SAR", bookings: 9, uncosted: 2, pnl: pnl(144_000_00, 129_500_00), commission: 1_450_00 },
      ],
    };
  }

  async settings(): Promise<FinanceSettings> {
    return { reportingCurrency: "SAR", commissionBps: 1000 };
  }

  async statements(): Promise<BspStatement[]> {
    return [];
  }

  async statement(): Promise<BspDetail> {
    throw new Error("statement not found");
  }

  async quoteRefund(i: RefundQuoteInput): Promise<RefundQuote> {
    const input = { paid: i.paid ?? 0, supplierCost: i.supplierCost ?? 0, supplierPenalty: i.supplierPenalty, serviceFee: i.serviceFee };
    return { bookingId: i.bookingId ?? null, currency: i.currency ?? "SAR", input, settlement: settleRefund(input) };
  }

  async letters(): Promise<Letter[]> {
    return [];
  }

  createAccount = serverOnly;
  updateAccount = serverOnly;
  postMovement = serverOnly;
  transfer = serverOnly;
  importFeed = serverOnly;
  matchMovement = serverOnly;
  ignoreMovement = serverOnly;
  createAgency = serverOnly;
  updateAgency = serverOnly;
  setAgencyStatus = serverOnly;
  assignBooking = serverOnly;
  unassignBooking = serverOnly;
  payInvoice = serverOnly;
  topUp = serverOnly;
  setBudget = serverOnly;
  setRates = serverOnly;
  importStatement = serverOnly;
  createLetter = serverOnly;
}

let memory: MemoryFinanceRepository | null = null;

export function createFinanceRepository(client: HttpClient = http): FinanceRepository {
  memory ??= new MemoryFinanceRepository();
  return createRepository<FinanceRepository>({
    api: new ApiFinanceRepository(client),
    memory,
    reads: ["overview", "accounts", "movements", "posStats", "receivables", "payables", "profitability", "settings", "statements", "statement", "quoteRefund", "letters"],
  });
}
