import {
  AlarmClock,
  BadgeCheck,
  Banknote,
  CircleAlert,
  CircleCheckBig,
  Clock4,
  Gauge,
  HandCoins,
  Hash,
  Inbox,
  type LucideIcon,
  MessagesSquare,
  Percent,
  PlugZap,
  Radio,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { ReportKind } from "../model";
import type { Severity } from "../lib/report-spec";

export type Look = { icon: LucideIcon; tone: Tone };

export const REPORT_KIND_LOOK: Record<ReportKind, Look> = {
  sales: { icon: TrendingUp, tone: "sky" },
  targets: { icon: Target, tone: "violet" },
  readiness: { icon: ShieldCheck, tone: "emerald" },
  sla: { icon: MessagesSquare, tone: "amber" },
  finance: { icon: Wallet, tone: "teal" },
  integrations: { icon: PlugZap, tone: "indigo" },
};

const METRIC_LOOK: Record<string, Look> = {
  leads_handled: { icon: UserPlus, tone: "sky" },
  leads_won: { icon: Trophy, tone: "emerald" },
  conversion_bps: { icon: Percent, tone: "violet" },
  collected_amt: { icon: HandCoins, tone: "teal" },
  targets: { icon: Target, tone: "violet" },
  ahead: { icon: TrendingUp, tone: "emerald" },
  on_track: { icon: Gauge, tone: "sky" },
  behind: { icon: TriangleAlert, tone: "rose" },
  bookings: { icon: ReceiptText, tone: "sky" },
  ready: { icon: BadgeCheck, tone: "emerald" },
  blocked: { icon: ShieldAlert, tone: "rose" },
  overrides: { icon: Workflow, tone: "amber" },
  conversations: { icon: Inbox, tone: "sky" },
  breached: { icon: AlarmClock, tone: "rose" },
  breach_bps: { icon: Clock4, tone: "amber" },
  channels: { icon: Radio, tone: "violet" },
  booked_amt: { icon: ReceiptText, tone: "indigo" },
  balance_amt: { icon: Banknote, tone: "amber" },
  overdue_count: { icon: CircleAlert, tone: "rose" },
  total: { icon: PlugZap, tone: "indigo" },
  errors: { icon: TriangleAlert, tone: "rose" },
  rows: { icon: Hash, tone: "zinc" },
  owners: { icon: Users, tone: "sky" },
};

export function metricLook(key: string): Look {
  return METRIC_LOOK[key] ?? { icon: Hash, tone: "zinc" };
}

export const SEVERITY_LOOK: Record<Severity, Look> = {
  critical: { icon: ShieldAlert, tone: "rose" },
  warning: { icon: TriangleAlert, tone: "amber" },
  info: { icon: CircleCheckBig, tone: "emerald" },
};

/** Tone of a status value (target pace, integration log state). */
export function statusTone(status: string): Tone {
  switch (status) {
    case "ahead":
    case "ok":
    case "success":
      return "emerald";
    case "on_track":
      return "sky";
    case "behind":
    case "error":
    case "failed":
      return "rose";
    case "degraded":
    case "retry":
      return "amber";
    default:
      return "zinc";
  }
}
