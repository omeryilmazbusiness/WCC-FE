import { cn } from "@/shared/lib/cn";
import type { PlanBrandTone } from "../model/plan-brand";

const WORD = {
  standard: "text-zinc-400",
  premium:
    "plan-sheen bg-[linear-gradient(110deg,#dbeafe_0%,#7dd3fc_22%,#2563eb_48%,#38bdf8_72%,#93c5fd_100%)] bg-clip-text text-transparent",
  ultimate:
    "plan-sheen bg-[linear-gradient(110deg,#fef3c7_0%,#fde68a_18%,#f59e0b_46%,#fbbf24_70%,#b45309_100%)] bg-clip-text text-transparent",
} as const;

const BADGE = {
  premium:
    "plan-sheen bg-[linear-gradient(110deg,#bfdbfe_0%,#38bdf8_45%,#2563eb_100%)] bg-clip-text text-transparent",
  ultimate:
    "plan-sheen bg-[linear-gradient(110deg,#fde68a_0%,#f59e0b_50%,#b45309_100%)] bg-clip-text text-transparent",
} as const;

type Props = {
  tone: PlanBrandTone;
  name: string;
  badge: string;
};

/** Product name in the sidebar: blue sheen on Premium, gold on Ultimate. */
export function PlanWordmark({ tone, name, badge }: Props) {
  const featured = tone === "premium" || tone === "ultimate";
  return (
    <div
      className={cn("flex items-baseline gap-x-2", featured ? "flex-wrap gap-y-0.5" : "min-w-0")}
      data-testid="shell-wordmark"
      data-plan-brand={tone}
    >
      <p
        className={cn(
          "font-semibold tracking-wide",
          featured ? "whitespace-nowrap text-[13px] leading-tight" : "min-w-0 truncate text-[10.5px] font-medium",
          WORD[tone],
        )}
      >
        {name}
      </p>
      {featured ? (
        <span
          data-testid="shell-plan-badge"
          className={cn(
            "whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.2em]",
            BADGE[tone],
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function planHairline(tone: PlanBrandTone): string {
  if (tone === "premium") {
    return "bg-gradient-to-r from-transparent via-sky-400/55 to-transparent";
  }
  if (tone === "ultimate") {
    return "bg-gradient-to-r from-transparent via-amber-300/60 to-transparent";
  }
  return "bg-gradient-to-r from-transparent via-white/15 to-transparent";
}

export function planEdge(tone: PlanBrandTone): string {
  if (tone === "premium") {
    return "bg-gradient-to-r from-transparent via-sky-400/70 to-transparent";
  }
  if (tone === "ultimate") {
    return "bg-gradient-to-r from-transparent via-amber-300/80 to-transparent";
  }
  return "hidden";
}
