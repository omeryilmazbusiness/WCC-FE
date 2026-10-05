import {
  AlarmClock,
  Banknote,
  BellRing,
  BrainCircuit,
  Building2,
  ChartColumnBig,
  CheckCheck,
  CircleCheckBig,
  CircleDot,
  FileClock,
  FileUp,
  FileX2,
  IdCard,
  Info,
  MessageSquareMore,
  MessageSquareWarning,
  PhoneCall,
  PlugZap,
  Siren,
  Sparkles,
  Stamp,
  TrendingDown,
  TriangleAlert,
  Wallet,
  WalletMinimal,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { NotificationSeverity, NotificationStatus } from "../model";

export type NotificationLook = { icon: LucideIcon; tone: Tone };

/** Icon and colour per notification kind; the single source for the center, bell and badges. */
export const NOTIFICATION_KIND_LOOK: Readonly<Record<string, NotificationLook>> = {
  "message.sla_breached": { icon: MessageSquareWarning, tone: "rose" },
  "message.sla_warning": { icon: MessageSquareMore, tone: "amber" },
  "lead.no_follow_up": { icon: PhoneCall, tone: "indigo" },
  "task.overdue": { icon: AlarmClock, tone: "amber" },
  "task.escalated": { icon: Siren, tone: "violet" },
  "task.reminder": { icon: BellRing, tone: "sky" },
  "payment.overdue": { icon: Banknote, tone: "rose" },
  "payment.due": { icon: Wallet, tone: "emerald" },
  "document.missing": { icon: FileX2, tone: "rose" },
  "document.expiring": { icon: FileClock, tone: "amber" },
  "passport.expiring": { icon: IdCard, tone: "teal" },
  "visa.follow_up": { icon: Stamp, tone: "indigo" },
  "target.behind": { icon: TrendingDown, tone: "rose" },
  "integration.unhealthy": { icon: PlugZap, tone: "zinc" },
  "booking.confirmed": { icon: CircleCheckBig, tone: "emerald" },
  "supplier.unconfirmed": { icon: Building2, tone: "amber" },
  "supplier.low_balance": { icon: WalletMinimal, tone: "rose" },
  "supplier.contract_expiring": { icon: CalendarClock, tone: "amber" },
  "report.ready": { icon: ChartColumnBig, tone: "sky" },
  "import.completed": { icon: FileUp, tone: "teal" },
  "ai.summary": { icon: Sparkles, tone: "violet" },
  "ai.lost_leads": { icon: BrainCircuit, tone: "violet" },
};

export const NOTIFICATION_SEVERITY_LOOK: Readonly<Record<NotificationSeverity, NotificationLook>> = {
  critical: { icon: TriangleAlert, tone: "rose" },
  warning: { icon: TriangleAlert, tone: "amber" },
  info: { icon: Info, tone: "sky" },
};

export const NOTIFICATION_STATUS_LOOK: Readonly<Record<NotificationStatus, NotificationLook>> = {
  open: { icon: CircleDot, tone: "rose" },
  acknowledged: { icon: CheckCheck, tone: "amber" },
  resolved: { icon: CircleCheckBig, tone: "emerald" },
};

/** A kind's own look, or its severity's when the kind is new to this client. */
export function notificationLook(kind: string, severity: NotificationSeverity): NotificationLook {
  return NOTIFICATION_KIND_LOOK[kind] ?? NOTIFICATION_SEVERITY_LOOK[severity] ?? NOTIFICATION_SEVERITY_LOOK.info;
}

/** Message key for a kind (next-intl treats dots as nesting). */
export function notificationKindKey(kind: string): string {
  return kind.replace(/\./g, "_");
}
