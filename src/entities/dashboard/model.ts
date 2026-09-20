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
};

export type TargetSnapshot = {
  label: string;
  targetAmount: number;
  actualAmount: number;
  expectedToDate: number;
  currency: string;
  status: "ahead" | "on_track" | "behind" | "placeholder";
};
