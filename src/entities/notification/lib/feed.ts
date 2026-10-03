import type { AppNotification, NotificationGroup } from "../model";

/** When a notification last changed; grouped alerts bump `updatedAt` on every repeat. */
export function notificationTimestamp(n: Pick<AppNotification, "createdAt" | "updatedAt">): string {
  return n.updatedAt || n.createdAt;
}

export type NotificationTotals = {
  open: number;
  acknowledged: number;
  /** Open alerts whose kind is critical. */
  critical: number;
};

/** Headline counts across the viewer's active notification groups. */
export function summarizeNotificationGroups(groups: readonly NotificationGroup[]): NotificationTotals {
  const out: NotificationTotals = { open: 0, acknowledged: 0, critical: 0 };
  for (const g of groups) {
    out.open += g.open;
    out.acknowledged += g.acknowledged;
    if (g.severity === "critical") out.critical += g.open;
  }
  return out;
}

export type NotificationDay = "today" | "yesterday" | "earlier";

const DAY_ORDER: readonly NotificationDay[] = ["today", "yesterday", "earlier"];

function startOfLocalDay(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

/** Local calendar bucket of a timestamp, relative to `now`; unparseable values fall into "earlier". */
export function notificationDay(iso: string, now: Date): NotificationDay {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "earlier";
  if (t >= startOfLocalDay(now.getFullYear(), now.getMonth(), now.getDate())) return "today";
  return t >= startOfLocalDay(now.getFullYear(), now.getMonth(), now.getDate() - 1) ? "yesterday" : "earlier";
}

export type NotificationDaySection = { day: NotificationDay; items: AppNotification[] };

/** Splits a list into Today / Yesterday / Earlier, keeping the list's own order inside each section. */
export function groupNotificationsByDay(items: readonly AppNotification[], now: Date): NotificationDaySection[] {
  const buckets = new Map<NotificationDay, AppNotification[]>(DAY_ORDER.map((d) => [d, []]));
  for (const n of items) buckets.get(notificationDay(notificationTimestamp(n), now))!.push(n);
  return DAY_ORDER.map((day) => ({ day, items: buckets.get(day)! })).filter((s) => s.items.length > 0);
}
