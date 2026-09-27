import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type ProgressRingProps = {
  /** 0–100; values outside are clamped for drawing, the label shows the real number. */
  value: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  label?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Activity-ring style progress indicator. */
export function ProgressRing({
  value,
  size = 128,
  thickness = 12,
  tone = "emerald",
  label,
  className,
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const drawn = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(drawn)}
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-zinc-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", TONES[tone].stroke)}
        />
      </svg>
      {label !== undefined ? (
        <div className="absolute inset-0 flex items-center justify-center text-center">{label}</div>
      ) : null}
    </div>
  );
}
