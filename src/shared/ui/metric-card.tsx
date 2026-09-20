import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const ACCENTS = {
  sky: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  zinc: "bg-zinc-100 text-zinc-600",
} as const;

export type MetricAccent = keyof typeof ACCENTS;

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: MetricAccent;
  hint?: string;
  className?: string;
  onClick?: () => void;
};

/**
 * Soft Light KPI tile — used on Manager dashboard and Target placeholder.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "sky",
  hint,
  className,
  onClick,
}: MetricCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[124px] flex-col justify-between overflow-hidden rounded-[22px] border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50/80 px-4 py-4 text-start transition-all duration-300",
        "hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_12px_32px_-18px_rgba(24,24,27,0.35)]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
          ACCENTS[accent],
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <div className="mt-3 min-w-0">
        <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-zinc-900">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[13px] font-medium text-zinc-500">
          {label}
        </p>
        {hint ? (
          <p className="mt-1 truncate text-[11px] font-medium text-zinc-400">
            {hint}
          </p>
        ) : null}
      </div>
    </Comp>
  );
}
