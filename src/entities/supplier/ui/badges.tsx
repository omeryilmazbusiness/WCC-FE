"use client";

import { useTranslations } from "next-intl";
import { Radar } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import type { Availability, HealthStatus } from "../model";
import { BLOCK_LOOK, HEALTH_LOOK, WARNING_LOOK } from "./look";

/** Connection health with a live dot and the last measured latency. */
export function HealthPill({ status, latencyMs, className }: { status: HealthStatus; latencyMs?: number; className?: string }) {
  const t = useTranslations("suppliers");
  const look = HEALTH_LOOK[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold", TONES[look.tone].soft, className)} data-testid="supplier-health-pill">
      <span className="relative flex h-2 w-2" aria-hidden>
        {status === "active" ? <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", TONES[look.tone].dot)} /> : null}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", TONES[look.tone].dot)} />
      </span>
      {t(`health.${status}`)}
      {latencyMs && latencyMs > 0 ? <span className="font-semibold opacity-75 tabular-nums">· {t("latencyMs", { ms: latencyMs })}</span> : null}
    </span>
  );
}

/** "Open to search" or the reason the supplier is closed, plus non-blocking warnings. */
export function AvailabilityBadges({ availability, compact = false }: { availability: Availability; compact?: boolean }) {
  const t = useTranslations("suppliers");
  const block = availability.reason ? BLOCK_LOOK[availability.reason] : null;
  const BlockIcon = block?.icon ?? Radar;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold",
          availability.bookable ? TONES.emerald.soft : TONES.rose.soft,
        )}
        data-testid="supplier-availability"
      >
        <BlockIcon className="h-3.5 w-3.5" aria-hidden />
        {availability.bookable ? t("availability.open") : t(`availability.blocked.${availability.reason}`)}
      </span>
      {compact
        ? null
        : availability.warnings.map((w) => {
            const Icon = WARNING_LOOK[w].icon;
            return (
              <span key={w} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", TONES.amber.soft)}>
                <Icon className="h-3 w-3" aria-hidden />
                {t(`availability.warning.${w}`)}
              </span>
            );
          })}
    </span>
  );
}

/** Horizontal funding gauge coloured by account state. */
export function FundingBar({ pct, exhausted, low }: { pct: number; exhausted: boolean; low: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
      <span
        className={cn("block h-full rounded-full transition-all duration-500", exhausted ? "bg-rose-500" : low ? "bg-amber-500" : "bg-emerald-500")}
        style={{ width: `${Math.max(exhausted ? 0 : 4, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
