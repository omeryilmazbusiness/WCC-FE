import { AlarmClock, Kanban, ListTodo, Trophy, WalletCards, type LucideIcon } from "lucide-react";
import type { TeamMetric } from "@/entities/dashboard";
import type { Tone } from "@/shared/ui";

export type TeamMetricLook = {
  icon: LucideIcon;
  tone: Tone;
  /** A higher value is a problem rather than an achievement. */
  alert?: boolean;
};

export const TEAM_METRIC_LOOK: Record<TeamMetric, TeamMetricLook> = {
  leads: { icon: Kanban, tone: "sky" },
  won: { icon: Trophy, tone: "emerald" },
  collected: { icon: WalletCards, tone: "indigo" },
  openTasks: { icon: ListTodo, tone: "amber" },
  overdue: { icon: AlarmClock, tone: "rose", alert: true },
};

/** Avatar palette; each member keeps one color via `colorIndex`. */
export const AVATAR_TONES: readonly Tone[] = ["sky", "indigo", "emerald", "amber", "rose", "violet", "teal"];

/** Podium colors for the top three on the active metric. */
export const RANK_BADGE = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-800", "bg-orange-300 text-orange-950"] as const;
