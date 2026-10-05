/** Finance hub domain: money is always integer minor units, rates are basis points (1 % = 100). */

export const BPS = 10_000;

export const ACCOUNT_KINDS = ["bank", "cash", "pos", "wallet"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const MOVEMENT_KINDS = ["collection", "supplier_payment", "transfer", "expense", "refund", "adjustment"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];
/** Kinds a user may post by hand (transfers have their own flow). */
export const MANUAL_MOVEMENT_KINDS = ["collection", "expense", "refund", "adjustment"] as const;

export type Direction = "in" | "out";
export const MATCH_STATUSES = ["na", "unmatched", "matched", "ignored"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const AGENCY_STATUSES = ["active", "suspended", "closed"] as const;
export type AgencyStatus = (typeof AGENCY_STATUSES)[number];
export const RISK_LEVELS = ["ok", "watch", "critical", "blocked"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const AGEING_BUCKETS = ["current", "d0_15", "d16_30", "d31_plus", "unscheduled"] as const;
export type AgeingBucket = (typeof AGEING_BUCKETS)[number];

export const BSP_TYPES = ["sale", "refund", "adm", "acm"] as const;
export type BspType = (typeof BSP_TYPES)[number];
export const BSP_STATUSES = ["amount_mismatch", "missing_in_system", "missing_in_bsp", "matched"] as const;
export type BspStatus = (typeof BSP_STATUSES)[number];

export type LetterParty = "agency" | "supplier";
export type LetterStatus = "sent" | "confirmed" | "disputed" | "expired";

export type Money = { currency: string; amount: number; count: number };
export type Converted = { items: Money[]; total: number; partial: boolean };

export type MonthFigure = { month: string; revenue: number; margin: number; bookings: number; partial: boolean };
export type CurrencyShare = { currency: string; amount: number; converted: number; shareBps: number; unconverted: boolean };
export type AlertCounts = {
  lowDeposits: number;
  lowAccounts: number;
  unmatchedCredits: number;
  pendingRefunds: number;
  suspendedAgencies: number;
  overdueSchedules: number;
  supplierDueSoon: number;
};

export type Overview = {
  reportingCurrency: string;
  cash: Converted;
  receivables: Converted;
  payables: Converted;
  deposits: Converted;
  netPosition: number;
  month: MonthFigure;
  monthMarginBps: number;
  trend: MonthFigure[];
  exposure: CurrencyShare[];
  alerts: AlertCounts;
  asOf: string;
};

export type Account = {
  id: string;
  branchId: string;
  kind: AccountKind;
  name: string;
  currency: string;
  bankName: string;
  iban: string;
  commissionBps: number;
  balance: number;
  lowBalanceThreshold: number;
  lowBalance: boolean;
  isActive: boolean;
  createdAt: string;
};

export type AccountInput = {
  kind: AccountKind;
  name: string;
  currency: string;
  bankName: string;
  iban: string;
  commissionBps: number;
  lowBalanceThreshold: number;
  isActive?: boolean;
  openingBalance?: number;
};

export type Movement = {
  id: string;
  accountId: string;
  direction: Direction;
  kind: MovementKind;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  balanceAfter: number;
  bookingId: string | null;
  supplierId: string | null;
  source: "manual" | "bank_feed";
  externalId: string;
  reference: string;
  counterparty: string;
  note: string;
  matchStatus: MatchStatus;
  occurredOn: string;
  createdAt: string;
};

export type MovementInput = {
  direction: Direction;
  kind: MovementKind;
  amount: number;
  fee?: number | null;
  bookingId?: string | null;
  reference: string;
  counterparty: string;
  note: string;
  occurredOn: string;
};

export type TransferInput = { fromAccountId: string; toAccountId: string; amount: number; fee: number; note: string; occurredOn: string };

export type FeedRow = { externalId: string; occurredOn: string; amount: number; direction: Direction; description: string; counterparty: string };
export type FeedResult = { imported: number; duplicates: number; autoMatched: number; unmatched: number };

export type PosStat = {
  accountId: string;
  name: string;
  currency: string;
  commissionBps: number;
  gross: number;
  fees: number;
  net: number;
  count: number;
  effectiveBps: number;
};

export type Exposure = { outstanding: number; overdue: number; oldestOverdueDays: number; openBookings: number; unconvertedBalance: boolean };
export type Risk = { available: number; usedPct: number; level: RiskLevel };

export type Agency = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  creditLimit: number;
  paymentTermsDays: number;
  graceDays: number;
  autoSuspend: boolean;
  status: AgencyStatus;
  suspendReason: string;
  exposure: Exposure;
  risk: Risk;
};

export type AgencyInput = {
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  creditLimit: number;
  paymentTermsDays: number;
  graceDays: number;
  autoSuspend: boolean;
};

export type Ageing = { currency: string; buckets: Record<AgeingBucket, number>; counts: Record<AgeingBucket, number>; total: number; overdue: number };

export type Debtor = {
  bookingId: string;
  refNo: number;
  customerName: string;
  phone: string;
  agencyId: string | null;
  agencyName: string;
  currency: string;
  balance: number;
  dueOn: string | null;
  daysLate: number;
};

export type Receivables = { ageing: Ageing[]; debtors: Debtor[]; agencies: Agency[] };

export type PayableSupplier = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  paymentModel: "prepaid" | "postpaid" | "card";
  currency: string;
  depositBalance: number;
  creditLimit: number;
  creditUsed: number;
  lowBalanceThreshold: number;
  openDisputes: number;
};

export type DueInvoice = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  amount: number;
  dueOn: string | null;
};

export type Payables = { suppliers: PayableSupplier[]; plan: DueInvoice[]; today: string };

export type PnL = { gross: number; net: number; tax: number; fee: number; costed: boolean; revenue: number; margin: number; marginBps: number };

export type BookingProfit = {
  bookingId: string;
  refNo: number;
  customerName: string;
  ownerName: string;
  serviceType: string;
  status: string;
  currency: string;
  pnl: PnL;
  createdAt: string;
};

export type Budget = { departureId: string; currency: string; revenue: number; cost: number; margin: number; note: string };
export type Variance = { revenue: number; cost: number; margin: number; costOverrun: boolean };

export type DepartureProfit = {
  departureId: string;
  packageName: string;
  departsOn: string | null;
  currency: string;
  bookings: number;
  pax: number;
  pnl: PnL;
  budget: Budget | null;
  variance: Variance | null;
};

export type RepEarnings = { userId: string; name: string; currency: string; bookings: number; uncosted: number; pnl: PnL; commission: number };

export type Profitability = {
  from: string;
  to: string;
  commissionBps: number;
  bookings: BookingProfit[];
  departures: DepartureProfit[];
  reps: RepEarnings[];
};

export type FinanceSettings = { reportingCurrency: string; commissionBps: number };

export type BspStatement = {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  total: number;
  systemTotal: number;
  difference: number;
  lineCount: number;
  matched: number;
  mismatched: number;
  missingSystem: number;
  missingBsp: number;
  createdAt: string;
};

export type BspLine = {
  id: string;
  documentNo: string;
  pnr: string;
  type: BspType;
  passenger: string;
  issuedOn: string | null;
  amount: number;
  bookingId: string | null;
  systemAmount: number | null;
  status: BspStatus;
};

export type BspDetail = BspStatement & { lines: BspLine[] };

export type BspLineInput = { documentNo: string; pnr: string; type: BspType; passenger: string; issuedOn: string; amount: number };
export type BspImportInput = { label: string; periodStart: string; periodEnd: string; currency: string; lines: BspLineInput[] };

export type RefundInput = { paid: number; supplierCost: number; supplierPenalty: number; serviceFee: number };
export type RefundSettlement = { customerRefund: number; supplierRefund: number; retained: number; agencyResult: number; shortfall: number };
export type RefundQuote = { bookingId: string | null; currency: string; input: RefundInput; settlement: RefundSettlement };
export type RefundQuoteInput = {
  bookingId?: string | null;
  currency?: string;
  paid?: number | null;
  supplierCost?: number | null;
  supplierPenalty: number;
  serviceFee: number;
};

export type Letter = {
  id: string;
  partyType: LetterParty;
  partyId: string;
  partyName: string;
  periodEnd: string;
  balance: number;
  currency: string;
  email: string;
  status: LetterStatus;
  responseNote: string;
  respondedBy: string;
  respondedAt: string | null;
  expiresAt: string;
  createdAt: string;
  /** Present only on the create response: the raw link credential. */
  token?: string;
};

export type PublicLetter = {
  company: string;
  partyType: LetterParty;
  partyName: string;
  periodEnd: string;
  balance: number;
  currency: string;
  status: LetterStatus;
  responseNote: string;
  respondedBy: string;
  respondedAt: string | null;
  expiresAt: string;
};
