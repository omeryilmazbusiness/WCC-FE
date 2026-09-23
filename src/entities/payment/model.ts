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

export type FinancialSummary = {
  bookingId: string;
  currency: string;
  reportingCurrency: string;
  booked: number;
  collected: number;
  recognized: number;
  margin: number;
  balance: number;
  credit: number;
  unverifiedAmt: number;
  pendingRefundAmt: number;
  scheduleOpenAmt: number;
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
