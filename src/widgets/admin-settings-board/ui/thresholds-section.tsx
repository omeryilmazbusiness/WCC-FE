"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  THRESHOLD_LIMITS,
  validateThresholds,
  type AdminConfigRepository,
  type ThresholdKey,
  type ThresholdSettings,
} from "@/entities/adminconfig";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, Input, Label, QueryState, useMutationFeedback } from "@/shared/ui";

type Props = { repo: AdminConfigRepository; canWrite: boolean };

/** SLA A/B lives in the SLA section; these are the other automation knobs. */
const FIELDS: readonly ThresholdKey[] = [
  "paymentOverdueHours",
  "missingDocHours",
  "leadNoFollowupHours",
  "visaFollowUpDays",
  "targetBehindPct",
  "capacitySoftPct",
];

/** Branch alert thresholds the automation sweeps read (T-284/T-289). */
export function ThresholdsSection({ repo, canWrite }: Props) {
  const t = useTranslations("adminSettings");
  const feedback = useMutationFeedback();
  const query = useApiQuery(() => repo.getThresholds(), [repo]);
  const [draft, setDraft] = useState<ThresholdSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data) setDraft({ ...query.data });
  }, [query.data]);

  const error = draft ? validateThresholds(draft) : null;

  async function save() {
    if (!draft || error) return;
    setSaving(true);
    try {
      await repo.putThresholds(draft);
      await query.refresh();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <QueryState loadingVariant="lines" loading={query.loading} error={query.error} onRetry={() => void query.reload()}>
      {draft ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-5" data-testid="thresholds-section">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((key) => {
              const limits = THRESHOLD_LIMITS[key];
              return (
                <div key={key}>
                  <Label htmlFor={`threshold-${key}`}>{t(`thresholds.${key}.label`)}</Label>
                  <Input
                    id={`threshold-${key}`}
                    type="number"
                    className="mt-1.5"
                    min={limits.min}
                    max={limits.max}
                    disabled={!canWrite}
                    value={draft[key]}
                    aria-invalid={error?.key === key}
                    onChange={(e) => setDraft({ ...draft, [key]: Math.trunc(Number(e.target.value)) })}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">{t(`thresholds.${key}.hint`)}</p>
                </div>
              );
            })}
          </div>
          {error ? (
            <p className="text-xs font-medium text-rose-600" role="alert">
              {t(`thresholds.${error.key}.label`)}: {t("thresholds.range", THRESHOLD_LIMITS[error.key])}
            </p>
          ) : null}
          <Button size="sm" disabled={!canWrite || saving || Boolean(error)} onClick={() => void save()}>
            {t("save")}
          </Button>
        </div>
      ) : null}
    </QueryState>
  );
}
