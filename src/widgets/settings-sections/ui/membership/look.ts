import {
  BadgePercent,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Bus,
  Coins,
  Crown,
  FileText,
  FileUp,
  Gem,
  Hotel,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Package,
  Plane,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stamp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { MembershipFeatureId } from "@/entities/company";
import type { CompanyPlan } from "@/entities/company/plan";
import type { Tone } from "@/shared/ui";

export type PlanLook = {
  icon: LucideIcon;
  tone: Tone;
  shell: string;
  ink: string;
};

export const PLAN_LOOK: Record<CompanyPlan, PlanLook> = {
  standard: {
    icon: Sparkles,
    tone: "sky",
    shell: "from-sky-50 via-white to-white ring-sky-200/80",
    ink: "text-sky-700",
  },
  premium: {
    icon: Crown,
    tone: "violet",
    shell: "from-violet-50 via-white to-white ring-violet-200/80",
    ink: "text-violet-700",
  },
  ultimate: {
    icon: Gem,
    tone: "amber",
    shell: "from-amber-50 via-white to-white ring-amber-200/80",
    ink: "text-amber-800",
  },
};

export const FEATURE_LOOK: Record<MembershipFeatureId, { icon: LucideIcon; tone: Tone }> = {
  users: { icon: Users, tone: "sky" },
  branches: { icon: Building2, tone: "indigo" },
  packages: { icon: Package, tone: "violet" },
  hotels: { icon: Hotel, tone: "amber" },
  buses: { icon: Bus, tone: "teal" },
  inbox: { icon: Inbox, tone: "rose" },
  ai: { icon: Sparkles, tone: "violet" },
  salesDesk: { icon: Briefcase, tone: "sky" },
  documents: { icon: FileText, tone: "zinc" },
  flights: { icon: Plane, tone: "sky" },
  tasks: { icon: ListChecks, tone: "emerald" },
  dashboard: { icon: LayoutDashboard, tone: "indigo" },
  payments: { icon: Wallet, tone: "emerald" },
  reports: { icon: BarChart3, tone: "teal" },
  visa: { icon: Stamp, tone: "amber" },
  suppliers: { icon: Truck, tone: "zinc" },
  pricing: { icon: BadgePercent, tone: "rose" },
  imports: { icon: FileUp, tone: "sky" },
  audit: { icon: ScrollText, tone: "zinc" },
  aiSetup: { icon: Bot, tone: "violet" },
  fx: { icon: Coins, tone: "amber" },
  finance: { icon: Landmark, tone: "emerald" },
  overrides: { icon: ShieldCheck, tone: "indigo" },
};
