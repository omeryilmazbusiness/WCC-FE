"use client";

import { useLocale, useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/format";
import { useCountdown } from "@/shared/lib/use-countdown";
import { holdCountdown } from "../lib/hold";

type Props = {
  expiresAt: string;
  className?: string;
};

/** Live "expires in 2d 4h" badge for an option hold; red under 24 h. */
export function HoldCountdownBadge({ expiresAt, className }: Props) {
  const t = useTranslations("bookings.hold");
  const locale = useLocale();
  const deadline = Date.parse(expiresAt);
  const remaining = useCountdown(Number.isNaN(deadline) ? null : deadline);
  if (Number.isNaN(deadline)) return null;
  const countdown = holdCountdown(remaining);
  return (
    <span
      data-testid="hold-countdown"
      role="timer"
      title={t("expiresAt", { at: formatDateTime(expiresAt, locale) })}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        countdown.urgent
          ? "bg-rose-50 text-rose-800 ring-rose-200"
          : "bg-amber-50 text-amber-900 ring-amber-200",
        className,
      )}
    >
      <Clock aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
      {t(countdown.key, countdown.values)}
    </span>
  );
}
