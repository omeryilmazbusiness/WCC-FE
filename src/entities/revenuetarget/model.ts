export type TargetMetric = "collected" | "booked";
export type TargetScope = "branch" | "team" | "employee";
export type TargetCurve = "linear" | "seasonal";
export type TargetStatus = "ahead" | "on_track" | "behind" | "placeholder";

export type RevenueTarget = {
  id: string;
  branchId: string;
  ownerId: string | null;
  teamId: string | null;
  label: string;
  targetAmount: number;
  currency: string;
  metric: TargetMetric;
  scopeType: TargetScope;
  curveType: TargetCurve;
  periodStart: string;
  periodEnd: string;
};

export type TargetWeight = { bucket: number; weightBps: number };
export type TargetShare = { userId: string; userName?: string; shareBps: number };

export type TargetProgress = {
  targetId: string;
  label: string;
  currency: string;
  metric: TargetMetric;
  scopeType: TargetScope;
  curveType: TargetCurve;
  targetAmount: number;
  actualAmount: number;
  expectedToDate: number;
  variance: number;
  progressBps: number;
  paceBps: number;
  forecastAmount: number;
  requiredPaceDaily: number;
  status: TargetStatus;
  periodStart: string;
  periodEnd: string;
  asOf: string;
};

export type TargetContribution = {
  userId: string;
  userName: string;
  shareBps: number;
  actualAmount: number;
  shareAmount: number;
  rank: number;
};

export type TargetSeriesPoint = {
  date: string;
  actual: number;
  expected: number;
};

export type TargetSource = {
  kind: "booking" | "payment" | string;
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  ownerId: string;
  ownerName: string;
  occurredAt: string;
  label: string;
};
