import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  FinanceQueueItem,
  FinanceQueueKind,
  FinancialSummary,
  Payment,
  PaymentSchedule,
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

function mapPayment(raw: Raw): Payment {
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
  return {
    bookingId: String(raw.booking_id ?? ""),
    currency: String(raw.currency ?? "SAR"),
    reportingCurrency: String(raw.reporting_currency ?? raw.currency ?? "SAR"),
    booked: Number(raw.booked ?? 0),
    collected: Number(raw.collected ?? 0),
    recognized: Number(raw.recognized ?? 0),
    margin: Number(raw.margin ?? 0),
    balance: Number(raw.balance ?? 0),
    credit: Number(raw.credit ?? 0),
    unverifiedAmt: Number(raw.unverified_amt ?? 0),
    pendingRefundAmt: Number(raw.pending_refund_amt ?? 0),
    scheduleOpenAmt: Number(raw.schedule_open_amt ?? 0),
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

  async queue(kind: FinanceQueueKind): Promise<FinanceQueueItem[]> {
    const data = await this.http.request<{ items?: Raw[] }>(
      `/finance/queues/${kind}`,
    );
    return (data.items ?? []).map(mapQueueItem);
  }

  async exportCsv(kind: FinanceQueueKind): Promise<Blob> {
    const token = tokenFromCookie();
    const res = await fetch(
      `${env.apiBaseUrl}/finance/export?kind=${encodeURIComponent(kind)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error("export failed");
    return res.blob();
  }
}

class MemoryPaymentRepository implements PaymentRepository {
  private payments: Payment[] = [];
  private schedules: PaymentSchedule[] = [];

  async listByBooking(bookingId: string) {
    return this.payments.filter((p) => p.bookingId === bookingId);
  }
  async summary(bookingId: string): Promise<FinancialSummary> {
    const list = await this.listByBooking(bookingId);
    const collected = list
      .filter((p) => p.status === "verified" || p.status === "approved")
      .reduce((s, p) => s + p.amount, 0);
    return {
      bookingId,
      currency: "SAR",
      reportingCurrency: "SAR",
      booked: 100000,
      collected,
      recognized: collected,
      margin: 20000,
      balance: Math.max(0, 100000 - collected),
      credit: Math.max(0, collected - 100000),
      unverifiedAmt: list
        .filter((p) => p.status === "unverified")
        .reduce((s, p) => s + Math.abs(p.amount), 0),
      pendingRefundAmt: list
        .filter((p) => p.status === "pending_approval")
        .reduce((s, p) => s + Math.abs(p.amount), 0),
      scheduleOpenAmt: this.schedules
        .filter((s) => s.bookingId === bookingId && s.status === "open")
        .reduce((a, s) => a + s.amount, 0),
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
  async queue(kind: FinanceQueueKind) {
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
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiPaymentRepository(http);
  if (!mem) mem = new MemoryPaymentRepository();
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
    listByBooking: wrap(api.listByBooking.bind(api), mem.listByBooking.bind(mem)),
    summary: wrap(api.summary.bind(api), mem.summary.bind(mem)),
    record: wrap(api.record.bind(api), mem.record.bind(mem)),
    verify: wrap(api.verify.bind(api), mem.verify.bind(mem)),
    reverse: wrap(api.reverse.bind(api), mem.reverse.bind(mem)),
    requestRefund: wrap(api.requestRefund.bind(api), mem.requestRefund.bind(mem)),
    approveRefund: wrap(api.approveRefund.bind(api), mem.approveRefund.bind(mem)),
    rejectRefund: wrap(api.rejectRefund.bind(api), mem.rejectRefund.bind(mem)),
    listSchedules: wrap(api.listSchedules.bind(api), mem.listSchedules.bind(mem)),
    createSchedule: wrap(api.createSchedule.bind(api), mem.createSchedule.bind(mem)),
    cancelSchedule: wrap(api.cancelSchedule.bind(api), mem.cancelSchedule.bind(mem)),
    queue: wrap(api.queue.bind(api), mem.queue.bind(mem)),
    exportCsv: wrap(api.exportCsv.bind(api), mem.exportCsv.bind(mem)),
  };
}
