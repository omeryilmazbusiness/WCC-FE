import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type {
  FinanceQueueItem,
  FinanceQueueKind,
  FinancialSummary,
  Payment,
  PaymentPromise,
  PaymentPromiseInput,
  PaymentPromiseStatus,
  PaymentSchedule,
} from "./model";

type Raw = Record<string, unknown>;

const str = (value: unknown) => (value == null ? "" : String(value));
const strOrNull = (value: unknown) => (typeof value === "string" && value ? value : null);
const numOrNull = (value: unknown) =>
  value === null || value === undefined || value === "" ? null : Number(value);
const day = (value: unknown) => str(value).slice(0, 10);

function mapPayment(raw: Raw): Payment {
  const rep = raw.reporting && typeof raw.reporting === "object" ? (raw.reporting as Raw) : null;
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id ?? raw.bookingId ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "SAR"),
    method: String(raw.method ?? ""),
    reference: String(raw.reference ?? ""),
    recordedBy: String(raw.recorded_by ?? raw.recordedBy ?? ""),
    eventType: String(raw.event_type ?? raw.eventType ?? "charge") as Payment["eventType"],
    status: String(raw.status ?? "verified") as Payment["status"],
    note: String(raw.note ?? ""),
    reversesPaymentId: (raw.reverses_payment_id ?? raw.reversesPaymentId ?? null) as
      | string
      | null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    amountReporting: numOrNull(rep?.amount),
    reportingCurrency: str(rep?.currency),
    fxRate: str(rep?.rate),
    fxEffectiveDate: day(rep?.effective_date),
    receivedAt: day(raw.received_at ?? raw.receivedAt),
    fxMissing: raw.fx_missing === true || raw.fxMissing === true,
  };
}

function mapSchedule(raw: Raw): PaymentSchedule {
  return {
    id: String(raw.id),
    bookingId: String(raw.booking_id ?? ""),
    dueAt: String(raw.due_at ?? raw.dueAt ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "SAR"),
    label: String(raw.label ?? ""),
    status: String(raw.status ?? "open") as PaymentSchedule["status"],
    createdAt: String(raw.created_at ?? ""),
  };
}

function mapSummary(raw: Raw): FinancialSummary {
  const rep = raw.reporting && typeof raw.reporting === "object" ? (raw.reporting as Raw) : null;
  const promises = (raw.promises && typeof raw.promises === "object" ? raw.promises : {}) as Raw;
  return {
    currency: str(raw.currency) || "SAR",
    subtotal: Number(raw.subtotal ?? 0),
    discount: Number(raw.discount ?? 0),
    tax: Number(raw.tax ?? 0),
    fees: Number(raw.fees ?? 0),
    total: Number(raw.total ?? 0),
    cost: numOrNull(raw.cost),
    margin: numOrNull(raw.margin),
    collected: Number(raw.collected ?? 0),
    pending: Number(raw.pending ?? 0),
    balance: Number(raw.balance ?? 0),
    reporting: rep
      ? {
          currency: str(rep.currency),
          total: Number(rep.total ?? 0),
          collected: Number(rep.collected ?? 0),
          balance: Number(rep.balance ?? 0),
          rate: str(rep.rate),
          effectiveDate: day(rep.effective_date),
        }
      : null,
    promises: {
      openCount: Number(promises.open_count ?? 0),
      openAmount: Number(promises.open_amount ?? 0),
      nextPromisedOn: strOrNull(promises.next_promised_on),
    },
  };
}

function mapPromise(raw: Raw): PaymentPromise {
  return {
    id: str(raw.id),
    bookingId: str(raw.booking_id ?? raw.bookingId),
    amount: Number(raw.amount ?? 0),
    currency: str(raw.currency) || "SAR",
    promisedOn: day(raw.promised_on ?? raw.promisedOn),
    note: str(raw.note),
    status: (str(raw.status) || "open") as PaymentPromiseStatus,
    taskId: strOrNull(raw.task_id ?? raw.taskId),
    createdBy: str(raw.created_by ?? raw.createdBy),
    createdAt: str(raw.created_at ?? raw.createdAt),
    resolvedAt: strOrNull(raw.resolved_at ?? raw.resolvedAt),
  };
}

function mapQueueItem(raw: Raw): FinanceQueueItem {
  return {
    kind: String(raw.kind ?? "") as FinanceQueueKind,
    bookingId: String(raw.booking_id ?? ""),
    bookingRef: String(raw.booking_ref ?? ""),
    customerName: String(raw.customer_name ?? ""),
    paymentId: raw.payment_id ? String(raw.payment_id) : undefined,
    scheduleId: raw.schedule_id ? String(raw.schedule_id) : undefined,
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "SAR"),
    amountReporting: numOrNull(raw.amount_reporting),
    reportingCurrency: str(raw.reporting_currency),
    dueAt: raw.due_at ? String(raw.due_at) : undefined,
    status: String(raw.status ?? ""),
    note: raw.note ? String(raw.note) : undefined,
  };
}

export type RecordPaymentInput = {
  bookingId: string;
  amount: number;
  currency?: string;
  method?: string;
  reference?: string;
  note?: string;
  /** `YYYY-MM-DD`, not in the future. */
  receivedAt?: string;
  /** Needs `payments.approve`; otherwise 403 `forbidden_auto_verify`. */
  autoVerify?: boolean;
};

export interface PaymentRepository {
  listByBooking(bookingId: string): Promise<Payment[]>;
  summary(bookingId: string): Promise<FinancialSummary>;
  record(input: RecordPaymentInput): Promise<Payment>;
  verify(paymentId: string): Promise<Payment>;
  reverse(paymentId: string, note?: string): Promise<Payment>;
  requestRefund(bookingId: string, amount: number, note?: string): Promise<Payment>;
  approveRefund(paymentId: string): Promise<Payment>;
  rejectRefund(paymentId: string): Promise<Payment>;
  listSchedules(bookingId: string): Promise<PaymentSchedule[]>;
  createSchedule(
    bookingId: string,
    input: { dueAt: string; amount: number; label?: string; currency?: string },
  ): Promise<PaymentSchedule>;
  cancelSchedule(id: string): Promise<PaymentSchedule>;
  listPromises(bookingId: string): Promise<PaymentPromise[]>;
  createPromise(bookingId: string, input: PaymentPromiseInput): Promise<PaymentPromise>;
  cancelPromise(id: string): Promise<PaymentPromise>;
  queue(kind: FinanceQueueKind): Promise<FinanceQueueItem[]>;
  exportCsv(kind: FinanceQueueKind): Promise<Blob>;
}

class ApiPaymentRepository implements PaymentRepository {
  constructor(private readonly http: HttpClient) {}

  async listByBooking(bookingId: string): Promise<Payment[]> {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/bookings/${bookingId}/payments`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapPayment);
  }

  async summary(bookingId: string): Promise<FinancialSummary> {
    return mapSummary(
      await this.http.request<Raw>(`/bookings/${bookingId}/financial-summary`),
    );
  }

  async record(input: RecordPaymentInput): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>("/payments", {
        method: "POST",
        body: JSON.stringify({
          booking_id: input.bookingId,
          amount: input.amount,
          currency: input.currency,
          method: input.method ?? "",
          reference: input.reference ?? "",
          note: input.note ?? "",
          ...(input.receivedAt ? { received_at: input.receivedAt } : {}),
          auto_verify: Boolean(input.autoVerify),
          idempotency_key: crypto.randomUUID(),
        }),
      }),
    );
  }

  async verify(paymentId: string): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>(`/payments/${paymentId}/verify`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async reverse(paymentId: string, note = ""): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>(`/payments/${paymentId}/reverse`, {
        method: "POST",
        body: JSON.stringify({ note, idempotency_key: crypto.randomUUID() }),
      }),
    );
  }

  async requestRefund(bookingId: string, amount: number, note = ""): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>("/payments/refunds", {
        method: "POST",
        body: JSON.stringify({
          booking_id: bookingId,
          amount,
          note,
          idempotency_key: crypto.randomUUID(),
        }),
      }),
    );
  }

  async approveRefund(paymentId: string): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>(`/payments/${paymentId}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async rejectRefund(paymentId: string): Promise<Payment> {
    return mapPayment(
      await this.http.request<Raw>(`/payments/${paymentId}/reject`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async listSchedules(bookingId: string): Promise<PaymentSchedule[]> {
    const data = await this.http.request<Raw[]>(
      `/bookings/${bookingId}/payment-schedules`,
    );
    return (Array.isArray(data) ? data : []).map(mapSchedule);
  }

  async createSchedule(
    bookingId: string,
    input: { dueAt: string; amount: number; label?: string; currency?: string },
  ): Promise<PaymentSchedule> {
    return mapSchedule(
      await this.http.request<Raw>(`/bookings/${bookingId}/payment-schedules`, {
        method: "POST",
        body: JSON.stringify({
          due_at: input.dueAt,
          amount: input.amount,
          label: input.label ?? "",
          currency: input.currency,
        }),
      }),
    );
  }

  async cancelSchedule(id: string): Promise<PaymentSchedule> {
    return mapSchedule(
      await this.http.request<Raw>(`/payment-schedules/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async listPromises(bookingId: string): Promise<PaymentPromise[]> {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/bookings/${bookingId}/payment-promises`,
    );
    const rows = Array.isArray(data) ? data : (data?.items ?? []);
    return rows.map(mapPromise);
  }

  async createPromise(bookingId: string, input: PaymentPromiseInput): Promise<PaymentPromise> {
    return mapPromise(
      await this.http.request<Raw>(`/bookings/${bookingId}/payment-promises`, {
        method: "POST",
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          promised_on: input.promisedOn,
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        }),
      }),
    );
  }

  async cancelPromise(id: string): Promise<PaymentPromise> {
    return mapPromise(
      await this.http.request<Raw>(`/payment-promises/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async queue(kind: FinanceQueueKind): Promise<FinanceQueueItem[]> {
    const data = await this.http.request<{ items?: Raw[] }>(
      `/finance/queues/${kind}`,
    );
    return (data.items ?? []).map(mapQueueItem);
  }

  async exportCsv(kind: FinanceQueueKind): Promise<Blob> {
    const res = await this.http.raw(
      `/finance/export?kind=${encodeURIComponent(kind)}`,
      { headers: { Accept: "text/csv" } },
    );
    return res.blob();
  }
}

const REPORTING_CURRENCY = "SAR";
const demoToReporting = (usdMinor: number) => Math.round((usdMinor * 375) / 100);

class MemoryPaymentRepository implements PaymentRepository {
  private payments: Payment[] = [];
  private schedules: PaymentSchedule[] = [];
  private promises: PaymentPromise[] = [];

  constructor() {
    const now = new Date().toISOString();
    const base = {
      bookingId: "bk-demo-partial",
      method: "transfer",
      reference: "",
      recordedBy: "Finance",
      eventType: "charge" as const,
      status: "verified" as const,
      note: "",
      reversesPaymentId: null,
      createdAt: now,
      reportingCurrency: REPORTING_CURRENCY,
      receivedAt: now.slice(0, 10),
      fxMissing: false,
    };
    this.payments.push(
      {
        ...base,
        id: "pay-demo-1",
        amount: 100000,
        currency: "USD",
        amountReporting: 375000,
        fxRate: "3.75000000",
        fxEffectiveDate: now.slice(0, 10),
      },
      {
        ...base,
        id: "pay-demo-2",
        amount: 50000,
        currency: "EGP",
        status: "unverified",
        amountReporting: null,
        fxRate: "",
        fxEffectiveDate: "",
      },
    );
    this.promises.push({
      id: "pp-demo-1",
      bookingId: "bk-demo-partial",
      amount: 150000,
      currency: "USD",
      promisedOn: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
      note: "Second instalment after salary",
      status: "open",
      taskId: null,
      createdBy: "Sales",
      createdAt: now,
      resolvedAt: null,
    });
  }

  async listByBooking(bookingId: string) {
    return this.payments.filter((p) => p.bookingId === bookingId);
  }
  async summary(bookingId: string): Promise<FinancialSummary> {
    const list = await this.listByBooking(bookingId);
    const collected = list
      .filter((p) => p.currency === "USD" && (p.status === "verified" || p.status === "approved"))
      .reduce((s, p) => s + p.amount, 0);
    const pending = list
      .filter((p) => p.currency === "USD" && p.status === "unverified")
      .reduce((s, p) => s + p.amount, 0);
    const open = this.promises.filter((p) => p.bookingId === bookingId && p.status === "open");
    const subtotal = 380000;
    const discount = 20000;
    const tax = 18000;
    const fees = 2000;
    const total = subtotal - discount + tax + fees;
    const balance = Math.max(0, total - collected);
    return {
      currency: "USD",
      subtotal,
      discount,
      tax,
      fees,
      total,
      cost: 280000,
      margin: total - 280000,
      collected,
      pending,
      balance,
      reporting: {
        currency: REPORTING_CURRENCY,
        total: demoToReporting(total),
        collected: demoToReporting(collected),
        balance: demoToReporting(balance),
        rate: "3.75000000",
        effectiveDate: new Date().toISOString().slice(0, 10),
      },
      promises: {
        openCount: open.length,
        openAmount: open.reduce((s, p) => s + p.amount, 0),
        nextPromisedOn: open.map((p) => p.promisedOn).sort()[0] ?? null,
      },
    };
  }
  async record(input: RecordPaymentInput): Promise<Payment> {
    const p: Payment = {
      id: crypto.randomUUID(),
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency ?? "SAR",
      method: input.method ?? "",
      reference: input.reference ?? "",
      recordedBy: "",
      eventType: "charge",
      status: input.autoVerify ? "verified" : "unverified",
      note: input.note ?? "",
      reversesPaymentId: null,
      createdAt: new Date().toISOString(),
      amountReporting: input.currency === REPORTING_CURRENCY ? input.amount : null,
      reportingCurrency: REPORTING_CURRENCY,
      fxRate: "",
      fxEffectiveDate: "",
      receivedAt: input.receivedAt ?? new Date().toISOString().slice(0, 10),
      fxMissing: input.currency !== REPORTING_CURRENCY,
    };
    this.payments.push(p);
    return p;
  }
  async verify(paymentId: string) {
    const p = this.payments.find((x) => x.id === paymentId)!;
    p.status = "verified";
    return p;
  }
  async reverse(paymentId: string, note = "") {
    const orig = this.payments.find((x) => x.id === paymentId)!;
    const p: Payment = {
      ...orig,
      id: crypto.randomUUID(),
      amount: -Math.abs(orig.amount),
      eventType: "reverse",
      status: "verified",
      note,
      reversesPaymentId: orig.id,
      createdAt: new Date().toISOString(),
    };
    this.payments.push(p);
    return p;
  }
  async requestRefund(bookingId: string, amount: number, note = "") {
    const p: Payment = {
      id: crypto.randomUUID(),
      bookingId,
      amount: -Math.abs(amount),
      currency: "SAR",
      method: "",
      reference: "",
      recordedBy: "",
      eventType: "refund",
      status: "pending_approval",
      note,
      reversesPaymentId: null,
      createdAt: new Date().toISOString(),
      amountReporting: -Math.abs(amount),
      reportingCurrency: REPORTING_CURRENCY,
      fxRate: "",
      fxEffectiveDate: "",
      receivedAt: "",
      fxMissing: false,
    };
    this.payments.push(p);
    return p;
  }
  async approveRefund(paymentId: string) {
    const p = this.payments.find((x) => x.id === paymentId)!;
    p.status = "approved";
    return p;
  }
  async rejectRefund(paymentId: string) {
    const p = this.payments.find((x) => x.id === paymentId)!;
    p.status = "rejected";
    return p;
  }
  async listSchedules(bookingId: string) {
    return this.schedules.filter((s) => s.bookingId === bookingId);
  }
  async createSchedule(bookingId: string, input: { dueAt: string; amount: number; label?: string }) {
    const s: PaymentSchedule = {
      id: crypto.randomUUID(),
      bookingId,
      dueAt: input.dueAt,
      amount: input.amount,
      currency: "SAR",
      label: input.label ?? "",
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.schedules.push(s);
    return s;
  }
  async cancelSchedule(id: string) {
    const s = this.schedules.find((x) => x.id === id)!;
    s.status = "cancelled";
    return s;
  }
  async listPromises(bookingId: string) {
    return this.promises.filter((p) => p.bookingId === bookingId);
  }
  async createPromise(bookingId: string, input: PaymentPromiseInput): Promise<PaymentPromise> {
    const p: PaymentPromise = {
      id: crypto.randomUUID(),
      bookingId,
      amount: input.amount,
      currency: input.currency,
      promisedOn: input.promisedOn,
      note: input.note ?? "",
      status: "open",
      taskId: null,
      createdBy: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.promises.push(p);
    return p;
  }
  async cancelPromise(id: string) {
    const p = this.promises.find((x) => x.id === id)!;
    p.status = "cancelled";
    p.resolvedAt = new Date().toISOString();
    return p;
  }
  async queue(kind: FinanceQueueKind): Promise<FinanceQueueItem[]> {
    if (kind === "unverified") {
      return this.payments
        .filter((p) => p.status === "unverified")
        .map((p) => ({
          kind,
          bookingId: p.bookingId,
          bookingRef: p.bookingId.slice(0, 8),
          customerName: "",
          paymentId: p.id,
          amount: p.amount,
          currency: p.currency,
          amountReporting: p.amountReporting,
          reportingCurrency: p.reportingCurrency,
          status: p.status,
        }));
    }
    if (kind === "refunds") {
      return this.payments
        .filter((p) => p.status === "pending_approval")
        .map((p) => ({
          kind,
          bookingId: p.bookingId,
          bookingRef: p.bookingId.slice(0, 8),
          customerName: "",
          paymentId: p.id,
          amount: p.amount,
          currency: p.currency,
          amountReporting: p.amountReporting,
          reportingCurrency: p.reportingCurrency,
          status: p.status,
        }));
    }
    return [];
  }
  async exportCsv(kind: FinanceQueueKind) {
    const items = await this.queue(kind);
    const lines = [
      "kind,booking_id,amount,currency,status",
      ...items.map(
        (i) => `${i.kind},${i.bookingId},${i.amount},${i.currency},${i.status}`,
      ),
    ];
    return new Blob([lines.join("\n")], { type: "text/csv" });
  }
}

let mem: MemoryPaymentRepository | null = null;

export function createPaymentRepository(): PaymentRepository {
  const api = new ApiPaymentRepository(http);
  if (!mem) mem = new MemoryPaymentRepository();
  return createRepository<PaymentRepository>({
    api,
    memory: mem,
    reads: ["listByBooking", "summary", "listSchedules", "listPromises", "queue", "exportCsv"],
  });
}
