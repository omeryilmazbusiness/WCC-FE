"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Flame, Gauge, Snowflake, Zap, type LucideIcon } from "lucide-react";
import { createAIRepository, type LeadScore } from "@/entities/ai";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";

type Band = "urgent" | "high" | "normal" | "low";

const BAND_LOOK: Record<Band, { icon: LucideIcon; className: string }> = {
  urgent: { icon: Flame, className: "bg-rose-50 text-rose-600 ring-rose-100" },
  high: { icon: Zap, className: "bg-amber-50 text-amber-700 ring-amber-100" },
  normal: { icon: Gauge, className: "bg-zinc-50 text-zinc-500 ring-zinc-100" },
  low: { icon: Snowflake, className: "bg-sky-50 text-sky-600 ring-sky-100" },
};

function isBand(value: string): value is Band {
  return value in BAND_LOOK;
}

const repo = createAIRepository();

/** AI priority for a lead, loaded lazily; renders nothing until a score exists. */
export function LeadPriorityBadge({ leadId }: { leadId: string }) {
  const t = useTranslations("pipeline.card.priority");
  const canScore = useCan("ai.write");
  const [score, setScore] = useState<LeadScore | null>(null);

  useEffect(() => {
    if (!canScore) return;
    let cancelled = false;
    void repo
      .scoreLead(leadId, false)
      .then((s) => {
        if (!cancelled) setScore(s);
      })
      .catch(() => {
        if (!cancelled) setScore(null);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, canScore]);

  if (!score) return null;
  const band: Band = isBand(score.priorityBand) ? score.priorityBand : "normal";
  const { icon: Icon, className } = BAND_LOOK[band];

  return (
    <span
      title={score.signals.map((s) => s.label).join(" · ")}
      data-testid="lead-priority"
      data-band={band}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden />
      {t(band)}
    </span>
  );
}
