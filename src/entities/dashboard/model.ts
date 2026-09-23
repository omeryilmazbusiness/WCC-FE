export type DashboardKPI = {
  leadsOpen: number;
  tasksOverdue: number;
  bookingsUnpaid: number;
  missingDocs: number;
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
