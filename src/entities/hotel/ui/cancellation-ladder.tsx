"use client";

import { useTranslations } from "next-intl";
import { CalendarCheck2, Moon, Percent, UserX, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";
import { cancellationLadder, type CancellationStep } from "../lib/pricing";
import type { CancellationPolicy } from "../model";

function stepLook(s: CancellationStep): { icon: LucideIcon; tone: Tone } {
  if (s.kind === "free") return { icon: CalendarCheck2, tone: "emerald" };
  if (s.kind === "no_show") return { icon: UserX, tone: "rose" };
  if (s.kind === "nights") return { icon: Moon, tone: "amber" };
  return { icon: Percent, tone: s.value >= 100 ? "rose" : "amber" };
}

/** The cancellation policy read top-down, from the free window to the no-show rule. */
export function CancellationLadder({ policy, className }: { policy: CancellationPolicy; className?: string }) {
  const t = useTranslations("hotels.policy.cancel");
  const steps = cancellationLadder(policy);

  const period = (s: CancellationStep) => {
    if (s.kind === "free") return t("ladder.freeWindow", { days: s.fromDays });
    if (s.kind === "no_show") return t("ladder.noShowWindow");
    return s.fromDays === s.toDays ? t("ladder.day", { day: s.fromDays }) : t("ladder.range", { from: s.fromDays, to: s.toDays });
  };
  const charge = (s: CancellationStep) => {
    if (s.kind === "free") return t("ladder.free");
    if (s.kind === "nights") return t("ladder.nights", { n: s.value });
    return t("ladder.percent", { pct: s.value });
  };

  return (
    <ol className={cn("relative space-y-2", className)} data-testid="cancellation-ladder">
      {steps.map((s, i) => {
        const look = stepLook(s);
        const Icon = look.icon;
        return (
          <li key={i} className={cn("flex items-center gap-3 rounded-[20px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[look.tone].tint)}>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", TONES[look.tone].solid)} aria-hidden>
              <Icon className="h-5 w-5" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-zinc-700">{period(s)}</span>
            <span className={cn("shrink-0 rounded-full px-3 py-1 text-[12.5px] font-bold", TONES[look.tone].soft)}>{charge(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
