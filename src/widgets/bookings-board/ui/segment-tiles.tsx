"use client";

import { useTranslations } from "next-intl";
import { AlarmClock, Ban, BriefcaseBusiness, CalendarX2, Stamp, Ticket, WalletCards, type LucideIcon } from "lucide-react";
import type { BookingSegment, BookingStats } from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";
import { ALL } from "../model/list-filters";

type Key = BookingSegment | typeof ALL;

const TILES: { key: Key; icon: LucideIcon; tone: Tone; count: (s: BookingStats) => number }[] = [
  { key: ALL, icon: BriefcaseBusiness, tone: "indigo", count: (s) => s.active },
  { key: "option_today", icon: AlarmClock, tone: "rose", count: (s) => s.optionToday },
  { key: "payment_due", icon: WalletCards, tone: "amber", count: (s) => s.paymentDue },
  { key: "visa_pending", icon: Stamp, tone: "violet", count: (s) => s.visaPending },
  { key: "overdue", icon: CalendarX2, tone: "rose", count: (s) => s.overdue },
  { key: "issued", icon: Ticket, tone: "emerald", count: (s) => s.issued },
  { key: "cancelled", icon: Ban, tone: "zinc", count: (s) => s.cancelled },
];

type Props = { value: Key; onChange: (key: Key) => void; stats: BookingStats | undefined };

/** iOS smart-list style segment tiles: icon and live count on top, label underneath. */
export function SegmentTiles({ value, onChange, stats }: Props) {
  const t = useTranslations("bookingWorkspace");
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7" role="group" aria-label={t("list.title")}>
      {TILES.map(({ key, icon: Icon, tone, count }) => {
        const active = value === key;
        const n = stats ? count(stats) : null;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && key !== ALL ? ALL : key)}
            data-testid={`booking-segment-${key}`}
            className={cn(
              "flex min-w-0 flex-col gap-2.5 rounded-[20px] p-3 text-start transition duration-200 ease-out active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2",
              active
                ? TONES[tone].solid
                : "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.25)] ring-1 ring-zinc-900/[0.05] hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_-18px_rgba(15,23,42,0.3)]",
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  active ? "bg-white/20 text-white" : TONES[tone].solid,
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
              </span>
              {n === null ? (
                <span className={cn("mt-2 h-5 w-8 animate-pulse rounded-md", active ? "bg-white/30" : "bg-zinc-200")} aria-hidden />
              ) : (
                <span className={cn("min-w-0 truncate text-[26px] font-bold leading-9 tracking-tight tabular-nums", active ? "text-white" : "text-zinc-950")}>
                  {n}
                </span>
              )}
            </span>
            <span className={cn("line-clamp-2 text-[13px] font-semibold leading-snug", active ? "text-white/85" : "text-zinc-500")}>
              {t(`segment.${key}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
