"use client";

import { useEffect, useMemo, useState } from "react";
import { createAIRepository, type LeadScore } from "@/entities/ai";
import { cn } from "@/shared/lib/cn";

const bandClass: Record<string, string> = {
  urgent: "bg-rose-50 text-rose-700",
  high: "bg-amber-50 text-amber-800",
  normal: "bg-zinc-100 text-zinc-600",
  low: "bg-zinc-50 text-zinc-400",
};

export function LeadPriorityBadge({ leadId }: { leadId: string }) {
  const repo = useMemo(() => createAIRepository(), []);
  const [score, setScore] = useState<LeadScore | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repo.scoreLead(leadId, false).then((s) => {
      if (!cancelled) setScore(s);
    });
    return () => {
      cancelled = true;
    };
  }, [leadId, repo]);

  if (!score) return null;

  return (
    <span
      title={score.signals.map((s) => s.label).join(" · ")}
      className={cn(
        "inline-flex rounded-lg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        bandClass[score.priorityBand] ?? bandClass.normal,
      )}
    >
      {score.priorityBand}
    </span>
  );
}
