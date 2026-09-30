import type { CSSProperties } from "react";
import { cn } from "@/shared/lib/cn";

type SoftGradientBackgroundProps = {
  className?: string;
  /** Seconds for one full trip around the hue wheel. */
  duration?: number;
};

/**
 * Decorative, slowly shifting OKLCH gradient that fills its nearest positioned
 * ancestor (or the viewport with `fixed`). Styles live in globals.css; browsers
 * without OKLCH interpolation get a static soft wallpaper, and reduced-motion
 * users get a still gradient.
 */
export function SoftGradientBackground({ className, duration = 24 }: SoftGradientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("soft-gradient-bg pointer-events-none absolute inset-0 -z-10", className)}
      style={{ "--soft-gradient-duration": `${Math.max(1, duration)}s` } as CSSProperties}
    />
  );
}
