"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { createAIRepository, type TargetInsight } from "@/entities/ai";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { Button } from "@/shared/ui";

type Props = { targetId: string };

export function TargetAIInsight({ targetId }: Props) {
  const t = useTranslations("aiTarget");
  const repo = useMemo(() => createAIRepository(), []);
  const [insight, setInsight] = useState<TargetInsight | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void repo
      .targetInsight(targetId)
      .then((v) => {
        if (!cancelled) setInsight(v);
      })
      .catch(() => {
        if (!cancelled) setInsight(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, repo]);

  if (busy && !insight) {
    return (
      <p className="text-xs font-medium text-zinc-400">{t("loading")}</p>
    );
  }
  if (!insight) return null;

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4"
      data-testid="target-ai-insight"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          {t("title")}
        </p>
        {insight.source === "deterministic" ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={routes.aiSetup}>{t("configure")}</Link>
          </Button>
        ) : null}
      </div>
      {insight.narrative ? (
        <p className="text-sm font-medium text-zinc-700">{insight.narrative}</p>
      ) : null}
      {insight.recommendations && insight.recommendations.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {insight.recommendations.map((r) => (
            <li
              key={r}
              className="text-sm font-medium text-zinc-600 before:me-2 before:content-['·']"
            >
              {r}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {insight.source === "ai" || insight.narrative
          ? t("sourceAi")
          : t("sourceRules")}
      </p>
    </div>
  );
}
