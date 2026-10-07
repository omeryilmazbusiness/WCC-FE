import {
  BookOpen,
  CircleHelp,
  Database,
  Eye,
  Gauge,
  Hash,
  History,
  Languages,
  LayoutDashboard,
  ListChecks,
  Lock,
  MailX,
  Minimize2,
  PenLine,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";

export type Look = { icon: LucideIcon; tone: Tone };

export const CAPABILITY_LOOK: Record<string, Look> = {
  ops_summary: { icon: LayoutDashboard, tone: "emerald" },
  lead_focus: { icon: Target, tone: "sky" },
  revenue_status: { icon: TrendingUp, tone: "amber" },
  message_draft: { icon: PenLine, tone: "violet" },
  app_help: { icon: CircleHelp, tone: "teal" },
};

export const RULE_ICON: Record<string, LucideIcon> = {
  read_only: Eye,
  no_send: MailX,
  own_scope: Lock,
  no_invented_numbers: Hash,
  minimal_data: Minimize2,
  faq_first: BookOpen,
  fixed_capabilities: ListChecks,
  never_blocked: Gauge,
  audited: ScrollText,
  user_language: Languages,
};

export const FALLBACK_LOOK: Look = { icon: ShieldCheck, tone: "zinc" };

/** How a question is answered, cheapest first; the model is the last resort. */
export const PIPELINE: readonly { id: "faq" | "rules" | "data" | "cache" | "ai"; icon: LucideIcon; tone: Tone }[] = [
  { id: "faq", icon: BookOpen, tone: "teal" },
  { id: "rules", icon: ListChecks, tone: "indigo" },
  { id: "data", icon: Database, tone: "emerald" },
  { id: "cache", icon: History, tone: "zinc" },
  { id: "ai", icon: Sparkles, tone: "violet" },
];
