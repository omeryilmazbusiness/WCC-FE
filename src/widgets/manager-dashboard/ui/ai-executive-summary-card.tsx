"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { createAIRepository, type DailySummary } from "@/entities/ai";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { useCan } from "@/entities/viewer";
import { Button, QueryState, WidgetCard } from "@/shared/ui";

export function AIExecutiveSummaryCard() {
  const t = useTranslations("ai");
  const repo = useMemo(() => createAIRepository(), []);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const canSetup = useCan("ai.setup");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const setup = await repo.getSetup();
      setConfigured(setup.configured && setup.enabled);
      const s = await repo.dailySummary();
      setSummary(s);
    } catch (err) {
      setSummary(null);
      setError(err);
    } finally {
      setBusy(false);
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <WidgetCard
      title={t("execTitle")}
      icon={Sparkles}
      tone="violet"
      data-testid="ai-executive-summary"
      actions={
        <div className="flex gap-2">
          {canSetup && configured === false ? (
            <Button asChild size="sm" variant="outline">
              <Link href={routes.aiSetup}>{t("configure")}</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("refresh")}
          </Button>
        </div>
      }
    >
      {error ? (
        <QueryState error={error} onRetry={() => void load()}>
          {null}
        </QueryState>
      ) : summary?.headline ? (
        <p className="text-sm font-semibold text-zinc-950">{summary.headline}</p>
      ) : (
        <p className="text-sm font-medium text-zinc-500">
          {busy ? t("loading") : t("empty")}
        </p>
      )}
      {summary?.bullets && summary.bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {summary.bullets.map((b) => (
            <li
              key={b}
              className="text-sm font-medium text-zinc-600 before:me-2 before:content-['·']"
            >
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {summary?.focus ? (
        <p className="mt-3 text-xs font-semibold text-zinc-500">
          {t("focus")}: {summary.focus}
        </p>
      ) : null}
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {summary?.source === "ai" ? t("sourceAi") : t("sourceRules")}
      </p>
    </WidgetCard>
  );
}
