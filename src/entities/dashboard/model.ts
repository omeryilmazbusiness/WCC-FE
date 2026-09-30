export type DashboardKPI = {
  leadsOpen: number;
  tasksOverdue: number;
  bookingsUnpaid: number;
  missingDocs: number;
  /** Minor units (e.g. halalas / cents). */
  bookedAmt?: number;
  /** Minor units. */
  collectedAmt?: number;
  /** Minor units. */
  marginAmt?: number;
  periodFrom: string;
  periodTo: string;
};

export type TeamMemberStat = {
  id: string;
  name: string;
  /** Account role: gm | manager | employee | finance | operations. */
  role: string;
  leadsHandled: number;
  leadsWon: number;
  openTasks: number;
  overdueTasks: number;
  /** Collected on the member's bookings in the period, minor units of `currency`. */
  collected: number;
  currency: string;
  /** Currencies left out of `collected` for lack of an FX rate. */
  unconverted: string[];
};

/** Exception sources in display order; mirrors the backend's AttentionKinds. */
export const ATTENTION_KINDS = ["escalated_task", "overdue_task", "unpaid_booking", "missing_doc", "capacity"] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

/** Record an attention row opens. */
export type AttentionLinkType = "booking" | "package" | "lead" | "conversation" | "revenue_target" | "task";

export type AttentionItem = {
  id: string;
  kind: AttentionKind | string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  relatedType: string;
  relatedId: string;
  ageHours: number;
  hrefHint: string;
  /** Who or what the row is about (customer, lead, package · departure). */
  context: string;
  linkType: AttentionLinkType | string;
  linkId: string;
  /** Open balance of an unpaid booking, minor units of `currency`. */
  amount: number | null;
  currency: string;
  capacitySold: number | null;
  capacityTotal: number | null;
  dueAt: string | null;
};

/** Counts over every open exception, not just the loaded page. */
export type AttentionSummary = {
  total: number;
  high: number;
  kinds: Record<AttentionKind, number>;
};

export type MyWorkItem = {
  id: string;
  source: "task" | "lead" | string;
  title: string;
  kind: string;
  priority: number;
  dueAt: string | null;
  relatedType: string;
  relatedId: string;
  overdue: boolean;
  escalated: boolean;
};

export type TargetSnapshot = {
  label: string;
  targetAmount: number;
  actualAmount: number;
  expectedToDate: number;
  currency: string;
  status: "ahead" | "on_track" | "behind" | "placeholder";
  periodStart?: string;
  periodEnd?: string;
};

/** Minor units in RevenueSummary.currency. */
export type MoneyStat = { amount: number; count: number };

export type RevenueMethod = { method: string; amount: number; count: number };

export type RevenuePoint = { date: string; amount: number };

/** Finance-ledger revenue in the branch reporting currency (all amounts minor units). */
export type RevenueSummary = {
  currency: string;
  periodFrom: string;
  periodTo: string;
  booked: MoneyStat;
  collected: MoneyStat;
  refunds: MoneyStat;
  netCollected: number;
  /** Null until at least one booking in the period has a cost entered. */
  margin: number | null;
  marginPct: number | null;
  costedBookings: number;
  /** Share of the period's booked amount already collected. */
  collectionPct: number | null;
  outstanding: MoneyStat;
  overdue: MoneyStat;
  dueSoon: MoneyStat;
  pendingVerification: MoneyStat;
  methods: RevenueMethod[];
  series: RevenuePoint[];
  /** Currencies left out because no FX rate exists for them. */
  unconverted: string[];
};
