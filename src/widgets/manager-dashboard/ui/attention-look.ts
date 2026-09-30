import { AlarmClock, AlertTriangle, FileWarning, Flame, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import type { AttentionKind } from "@/entities/dashboard";
import type { Tone } from "@/shared/ui";

export type AttentionLook = { icon: LucideIcon; tone: Tone };

export const ATTENTION_LOOK: Record<AttentionKind, AttentionLook> = {
  escalated_task: { icon: Flame, tone: "rose" },
  overdue_task: { icon: AlarmClock, tone: "amber" },
  unpaid_booking: { icon: WalletCards, tone: "indigo" },
  missing_doc: { icon: FileWarning, tone: "violet" },
  capacity: { icon: UsersRound, tone: "sky" },
};

const FALLBACK: AttentionLook = { icon: AlertTriangle, tone: "zinc" };

export function lookFor(kind: string): AttentionLook {
  return ATTENTION_LOOK[kind as AttentionKind] ?? FALLBACK;
}

const HOUR_MS = 3_600_000;

/** Whole hours from `iso` to now; negative when `iso` is in the future. */
export function hoursSince(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : Math.trunc((now - t) / HOUR_MS);
}
