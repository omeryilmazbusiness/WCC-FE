export type {
  DashboardKPI,
  TeamMemberStat,
  TargetSnapshot,
  AttentionItem,
  AttentionKind,
  AttentionLinkType,
  AttentionSummary,
  MyWorkItem,
  MoneyStat,
  RevenueMethod,
  RevenuePoint,
  RevenueSummary,
} from "./model";
export {
  type DashboardRepository,
  MemoryDashboardRepository,
  ApiDashboardRepository,
  getMemoryDashboardRepository,
  createDashboardRepository,
  mapRevenue,
  mapAttentionSummary,
  summarizeAttention,
} from "./api";
export { ATTENTION_KINDS } from "./model";
export { attentionHref } from "./lib/attention-link";
