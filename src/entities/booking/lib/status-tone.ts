import type { BookingStatus } from "../model";

export type StatusTone = {
  /** Chip background / text / ring — text is ≥ 4.5:1 on its background. */
  chip: string;
  dot: string;
};

export const BOOKING_STATUS_TONES: Record<BookingStatus, StatusTone> = {
  draft: { chip: "bg-zinc-100 text-zinc-700 ring-zinc-300", dot: "bg-zinc-400" },
  quoted: { chip: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  option_hold: { chip: "bg-amber-50 text-amber-900 ring-amber-300", dot: "bg-amber-500" },
  confirmed: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  partially_paid: { chip: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  ready: { chip: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500" },
  travelled: { chip: "bg-indigo-50 text-indigo-800 ring-indigo-200", dot: "bg-indigo-500" },
  completed: { chip: "bg-zinc-800 text-white ring-zinc-800", dot: "bg-white" },
  cancelled: { chip: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
};

/** Normally advanced by the system (payments, readiness, travel dates), not by staff. */
export const SYSTEM_DRIVEN_STATUSES: readonly BookingStatus[] = [
  "partially_paid",
  "ready",
  "travelled",
];
