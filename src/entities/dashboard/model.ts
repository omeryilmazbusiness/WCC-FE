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
  role: string;
  leadsHandled: number;
  openTasks: number;
  overdueTasks: number;
  revenueShare: number;
  collectedAmt?: number;
};

export type AttentionItem = {
  id: string;
  kind: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  relatedType: string;
  relatedId: string;
  ageHours: number;
  hrefHint: string;
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
