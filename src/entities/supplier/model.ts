/** Mirrors `internal/domain/supplier` — the backend stays the source of truth. */

export const SUPPLIER_CATEGORIES = ["gds", "wholesaler", "dmc", "transfer", "visa", "insurance", "other"] as const;
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export const INTEGRATION_TYPES = ["api", "feed", "manual"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const ENVIRONMENTS = ["sandbox", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const HEALTH_STATUSES = ["active", "degraded", "down", "unknown"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const PAYMENT_MODELS = ["prepaid", "postpaid", "card"] as const;
export type PaymentModel = (typeof PAYMENT_MODELS)[number];

export const PAYMENT_TERMS = ["on_booking", "net7", "net15", "net30", "weekly"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const PRODUCTS = ["flight", "hotel", "transfer", "visa", "insurance", "package"] as const;
export type Product = (typeof PRODUCTS)[number];

export const REGIONS = [
  "makkah",
  "madinah",
  "jeddah",
  "riyadh",
  "saudi",
  "gcc",
  "middle_east",
  "turkey",
  "europe",
  "asia",
  "global",
] as const;
export type Region = (typeof REGIONS)[number];

export const CREDENTIAL_KEYS = ["api_key", "client_id", "client_secret", "account_id"] as const;
export type CredentialKey = (typeof CREDENTIAL_KEYS)[number];

export const ENTRY_KINDS = ["topup", "charge", "refund", "payment", "adjustment"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const DISPUTE_STATUSES = ["open", "resolved", "rejected"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const SUPPLIER_CURRENCIES = ["SAR", "USD", "EUR", "TRY", "AED", "GBP"] as const;

export const BLOCK_REASONS = ["inactive", "contract_expired", "down", "deposit_exhausted", "credit_exhausted"] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

export const WARNINGS = ["low_balance", "contract_expiring", "degraded"] as const;
export type AvailabilityWarning = (typeof WARNINGS)[number];

export const MAX_MARKUP_BPS = 50_000;
export const MAX_FREE_CANCEL_HOURS = 8760;
export const CONTRACT_WARN_DAYS = 30;
export const SLOW_LATENCY_MS = 1500;
export const METRICS_WINDOW_DAYS = 30;
export const DEFAULT_CURRENCY = "SAR";

export type Integration = {
  type: IntegrationType;
  environment: Environment;
  apiBaseUrl: string;
  webhookUrl: string;
};

export type Health = {
  status: HealthStatus;
  latencyMs: number;
  checkedAt: string | null;
  note: string;
};

/** Money is integer minor units, like every amount in the API. */
export type Finance = {
  paymentModel: PaymentModel;
  currency: string;
  depositBalance: number;
  creditLimit: number;
  creditUsed: number;
  lowBalanceThreshold: number;
  paymentTerms: PaymentTerms;
};

/** Markup in basis points per product (300 = 3%). */
export type Markups = Partial<Record<Product, number>>;

export type Availability = {
  bookable: boolean;
  reason: BlockReason | "";
  warnings: AvailabilityWarning[];
};

export type Supplier = {
  id: string;
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: SupplierCategory;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emergencyPhone: string;
  /** Cancellation SLA and other service rules. */
  terms: string;
  integration: Integration;
  health: Health;
  finance: Finance;
  markups: Markups;
  regions: Region[];
  freeCancelHours: number;
  contractStart: string | null;
  contractEnd: string | null;
  isActive: boolean;
  availability: Availability;
  contractDaysLeft: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierListItem = Supplier & {
  hasCredentials: boolean;
  openDisputes: number;
  spend30d: number;
  bookings30d: number;
};

export type Metrics = {
  searches: number;
  bookings: number;
  errors: number;
  priceChanges: number;
  soldOuts: number;
  avgLatencyMs: number;
  lookToBook: number;
  errorRatePct: number;
  failedBookingPct: number;
  windowDays: number;
};

export type Volume = { spend: number; bookings: number; refunds: number };

export type LedgerEntry = {
  id: string;
  supplierId: string;
  kind: EntryKind;
  amount: number;
  currency: string;
  balanceAfter: number;
  reference: string;
  note: string;
  actorId: string | null;
  createdAt: string;
};

export type Dispute = {
  id: string;
  supplierId: string;
  title: string;
  bookingRef: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  resolution: string;
  openedAt: string;
  resolvedAt: string | null;
};

export type SupplierDetail = {
  supplier: Supplier;
  /** Masked credential hints ("••••1234"); plaintext never leaves the server. */
  credentials: Partial<Record<CredentialKey, string>>;
  metrics: Metrics;
  volume: Volume;
  ledger: LedgerEntry[];
  canViewLedger: boolean;
  disputes: Dispute[];
  openDisputes: number;
  today: string;
};

export type RouteOption = {
  supplierId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: SupplierCategory;
  availability: Availability;
  score: number;
  markupBps: number;
  health: HealthStatus;
  latencyMs: number;
  currency: string;
};

/** Full editable profile; credentials are a patch (value replaces, "" clears, missing keeps). */
export type SupplierInput = {
  code: string;
  nameEn: string;
  nameAr: string;
  category: SupplierCategory;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emergencyPhone: string;
  terms: string;
  integrationType: IntegrationType;
  environment: Environment;
  apiBaseUrl: string;
  webhookUrl: string;
  credentials: Partial<Record<CredentialKey, string>>;
  paymentModel: PaymentModel;
  currency: string;
  creditLimit: number;
  lowBalanceThreshold: number;
  paymentTerms: PaymentTerms;
  markups: Markups;
  regions: Region[];
  freeCancelHours: number;
  contractStart: string;
  contractEnd: string;
  isActive: boolean;
};

export type LedgerInput = { kind: EntryKind; amount: number; reference: string; note: string };

export type UsageInput = {
  day?: string;
  searches: number;
  bookings: number;
  errors: number;
  priceChanges: number;
  soldOuts: number;
  latencyMs: number;
};

export type DisputeInput = { title: string; bookingRef: string; amount: number; currency?: string };

export type SupplierListFilter = { q?: string; category?: SupplierCategory | ""; activeOnly?: boolean };

// --- Allotment links, invoices and issue log ---

export type SupplierLinkType = "package" | "departure" | "service";
export const LINK_TYPES: SupplierLinkType[] = ["package", "departure", "service"];

export type ConfirmationStatus = "pending" | "confirmed" | "cancelled";

export type SupplierLink = {
  id: string;
  supplierId: string;
  linkType: SupplierLinkType;
  linkId: string;
  confirmationStatus: ConfirmationStatus;
  confirmationRef: string;
  confirmedAt: string | null;
  allotment: number;
  sold: number;
  unitCost: number;
  currency: string;
  notes: string;
  oversold: boolean;
  createdAt: string;
  updatedAt: string;
};

export const INVOICE_STATUSES = ["draft", "submitted", "approved", "paid", "void"] as const;
export type SupplierInvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Allowed next statuses (mirrors `CanTransition`). */
export const INVOICE_TRANSITIONS: Record<SupplierInvoiceStatus, SupplierInvoiceStatus[]> = {
  draft: ["submitted", "void"],
  submitted: ["approved", "draft", "void"],
  approved: ["paid", "void"],
  paid: [],
  void: [],
};

export type SupplierInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  linkId: string | null;
  lineTotal: number;
};

export type SupplierInvoice = {
  id: string;
  supplierId: string;
  branchId: string;
  invoiceNumber: string;
  status: SupplierInvoiceStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: SupplierInvoiceLine[];
  createdAt: string;
  updatedAt: string;
};

export const ISSUE_KINDS = ["note", "delay", "quality", "cancellation", "invoice", "other"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];
export const ISSUE_SEVERITIES = ["info", "warning", "critical"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export type IssueEvent = {
  id: string;
  supplierId: string;
  kind: IssueKind;
  severity: IssueSeverity;
  note: string;
  actorId: string | null;
  createdAt: string;
};

export type CreateIssueInput = { note: string; kind?: IssueKind; severity?: IssueSeverity };
