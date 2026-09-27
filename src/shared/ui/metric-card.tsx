import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";


export type MetricAccent = Tone;

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
          TONES[accent].soft,
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
