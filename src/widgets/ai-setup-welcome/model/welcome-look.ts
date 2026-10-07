import {
  Calculator,
  Flame,
  LockKeyhole,
  MessageSquareText,
  ScanText,
  Sparkles,
  Sun,
  Target,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { AIStatus } from "@/entities/ai";
import type { Tone } from "@/shared/ui";

type Look<Id extends string> = { id: Id; icon: LucideIcon; tone: Tone };

/** What AI unlocks across the app, in the order a manager meets it. */
export const AI_FEATURES: readonly Look<"briefing" | "drafts" | "priority" | "ocr" | "targets" | "assistant">[] = [
  { id: "briefing", icon: Sun, tone: "amber" },
  { id: "drafts", icon: MessageSquareText, tone: "sky" },
  { id: "priority", icon: Flame, tone: "rose" },
  { id: "ocr", icon: ScanText, tone: "teal" },
  { id: "targets", icon: Target, tone: "violet" },
  { id: "assistant", icon: Sparkles, tone: "indigo" },
];

/** Rules that hold whatever provider is connected. */
export const AI_GUARDRAILS: readonly Look<"key" | "numbers" | "human">[] = [
  { id: "key", icon: LockKeyhole, tone: "emerald" },
  { id: "numbers", icon: Calculator, tone: "sky" },
  { id: "human", icon: UserCheck, tone: "amber" },
];

export const STATUS_LOOK: Record<AIStatus, { dot: string; pill: string }> = {
  off: { dot: "bg-zinc-400", pill: "bg-zinc-100 text-zinc-600" },
  paused: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  ready: { dot: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]", pill: "bg-emerald-50 text-emerald-700" },
};
