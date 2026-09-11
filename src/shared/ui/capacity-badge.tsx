import { cn } from "@/shared/lib/cn";

type CapacityBadgeProps = {
  sold: number;
  total: number;
  /** Localized “left” / “متبقي” etc. */
  remainingLabel: string;
  className?: string;
};

/**
 * Departure capacity indicator — green / amber / red by fill ratio.
 */
export function CapacityBadge({
  sold,
  total,
  remainingLabel,
  className,
}: CapacityBadgeProps) {
  const remaining = Math.max(0, total - sold);
  const ratio = total <= 0 ? 1 : sold / total;
  const tone =
    ratio >= 1
      ? "bg-red-50 text-red-700 ring-red-100"
      : ratio >= 0.8
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : "bg-emerald-50 text-emerald-800 ring-emerald-100";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset tabular-nums",
        tone,
        className,
      )}
      title={`${sold} / ${total}`}
    >
      <span className="opacity-70">
        {sold}/{total}
      </span>
      <span aria-hidden>·</span>
      <span>
        {remaining} {remainingLabel}
      </span>
    </span>
  );
}
