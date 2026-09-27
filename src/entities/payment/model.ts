export type PaymentEventType = "charge" | "reverse" | "adjust" | "refund";
export type PaymentStatus =
  | "unverified"
  | "verified"
  | "pending_approval"
  | "approved"
  | "rejected";

export type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  recordedBy: string;
  eventType: PaymentEventType;
  status: PaymentStatus;
  note: string;
  reversesPaymentId: string | null;
  createdAt: string;
  /** Minor units in `reportingCurrency`; `null` when no FX rate was available. */
  amountReporting: number | null;
  reportingCurrency: string;
  fxRate: string;
  fxEffectiveDate: string;
  /** `YYYY-MM-DD` the money was received. */
  receivedAt: string;
  /** Record response only: the payment was stored without a reporting amount. */
  fxMissing: boolean;
};

export type PaymentSchedule = {
  id: string;
  bookingId: string;
  dueAt: string;
  amount: number;
  currency: string;
  label: string;
  status: "open" | "paid" | "cancelled" | "overdue";
  createdAt: string;
};

export type ReportingSummary = {
  currency: string;
  total: number;
  collected: number;
  balance: number;
  rate: string;
  effectiveDate: string;
};

export type PromisesSummary = {
  openCount: number;
  openAmount: number;
  nextPromisedOn: string | null;
};

/** All amounts in minor units of `currency`. `cost` / `margin` are omitted without financial access. */
export type FinancialSummary = {
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  fees: number;
  total: number;
  cost: number | null;
  margin: number | null;
  collected: number;
  pending: number;
  balance: number;
  reporting: ReportingSummary | null;
  promises: PromisesSummary;
};

export type PaymentPromiseStatus = "open" | "kept" | "broken" | "cancelled";

export type PaymentPromise = {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  /** `YYYY-MM-DD` */
  promisedOn: string;
  note: string;
  status: PaymentPromiseStatus;
  taskId: string | null;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type PaymentPromiseInput = {
  amount: number;
  currency: string;
  promisedOn: string;
  note?: string;
};

export type FinanceQueueKind = "overdue" | "unverified" | "refunds" | "credit";

export type FinanceQueueItem = {
  kind: FinanceQueueKind;
  bookingId: string;
  bookingRef: string;
  customerName: string;
  paymentId?: string;
  scheduleId?: string;
  amount: number;
  currency: string;
  amountReporting: number | null;
  reportingCurrency: string;
  dueAt?: string;
  status: string;
  note?: string;
};

export const FINANCE_QUEUES: FinanceQueueKind[] = [
  "overdue",
  "unverified",
  "refunds",
  "credit",
];

export const SOD_VIOLATION_CODE = "sod_violation";
export const FORBIDDEN_AUTO_VERIFY_CODE = "forbidden_auto_verify";
