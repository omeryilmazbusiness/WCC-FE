export type {
  RevenueTarget,
  TargetProgress,
  TargetWeight,
  TargetShare,
  TargetContribution,
  TargetSeriesPoint,
  TargetSource,
  TargetStatus,
  TargetPeriodKind,
  TargetMetric,
} from "./model";
export {
  TARGET_PERIOD_KINDS,
  MAX_PERIOD_DAYS,
  daysInclusive,
  isCalendarPeriod,
  isoWeek,
  resolvePeriod,
  shiftPeriod,
  todayISO,
  type PeriodError,
  type PeriodRange,
} from "./lib/period";
export { PERIOD_KIND_META, PeriodKindIcon, TARGET_STATUS_TONE } from "./ui/period-kind";
export {
  createRevenueTargetRepository,
  type RevenueTargetRepository,
  type CreateTargetInput,
} from "./api";
