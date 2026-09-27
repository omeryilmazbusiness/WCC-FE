"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  slaScaledMinutes,
  THRESHOLD_LIMITS,
  validateThresholds,
  type AdminConfigRepository,
  type SlaPolicy,
  type ThresholdSettings,
} from "@/entities/adminconfig";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, Input, Label, QueryState, useMutationFeedback } from "@/shared/ui";

const KNOWN_CHANNELS = ["whatsapp", "instagram", "facebook", "gmail", "email"] as const;

type Props = { repo: AdminConfigRepository; canWrite: boolean };

/**
 * First-response windows per channel plus the A (warning) / B (breach) shares of that
 * window the SLA sweep uses (T-284/T-289). Both are saved together.
 */
export function SlaSection({ repo, canWrite }: Props) {
  const t = useTranslations("adminSettings");
  const feedback = useMutationFeedback();
  const query = useApiQuery(async () => {
    const [sla, thresholds] = await Promise.all([repo.getSla(), repo.getThresholds()]);
    return { sla, thresholds };
  }, [repo]);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [ab, setAb] = useState({ warn: 75, breach: 100 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setPolicies(query.data.sla.map((p) => ({ ...p })));
    setAb({ warn: query.data.thresholds.slaWarnPct, breach: query.data.thresholds.slaBreachPct });
  }, [query.data]);

  const base = query.data?.thresholds;
  const nextThresholds: ThresholdSettings | null = base
    ? { ...base, slaWarnPct: ab.warn, slaBreachPct: ab.breach }
    : null;
  const abError = nextThresholds ? validateThresholds(nextThresholds) : null;
  const invalidWindow = policies.some((p) => !Number.isInteger(p.firstResponseSeconds) || p.firstResponseSeconds <= 0);
  const unused = KNOWN_CHANNELS.filter((c) => !policies.some((p) => p.channel === c));
  const reference = policies.find((p) => p.channel === "*") ?? policies[0];

  async function save() {
    if (!nextThresholds || abError || invalidWindow) return;
    setSaving(true);
    try {
      await repo.putSla(policies);
      if (base && (base.slaWarnPct !== ab.warn || base.slaBreachPct !== ab.breach)) {
        await repo.putThresholds(nextThresholds);
      }
      await query.refresh();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <QueryState loading={query.loading} error={query.error} onRetry={() => void query.reload()}>
      <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-5" data-testid="sla-section">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{t("sla.windowsTitle")}</p>
          <p className="text-xs text-zinc-500">{t("sla.windowsHint")}</p>
        </div>
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {policies.map((p, i) => (
            <li key={p.channel} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900">
                {p.channel === "*" ? t("sla.defaultChannel") : p.channel}
              </span>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  aria-label={t("sla.minutes")}
                  disabled={!canWrite}
                  value={Math.round(p.firstResponseSeconds / 60)}
                  onChange={(e) => {
                    const minutes = Math.trunc(Number(e.target.value));
                    setPolicies(policies.map((x, j) => (j === i ? { ...x, firstResponseSeconds: minutes * 60 } : x)));
                  }}
                />
                {t("sla.minutes")}
              </label>
            </li>
          ))}
        </ul>
        {canWrite && unused.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{t("sla.addChannel")}</span>
            {unused.map((c) => (
              <Button
                key={c}
                size="sm"
                variant="outline"
                onClick={() =>
                  setPolicies([...policies, { channel: c, firstResponseSeconds: reference?.firstResponseSeconds ?? 900 }])
                }
              >
                + {c}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">{t("sla.abTitle")}</p>
          <p className="text-xs text-zinc-500">{t("sla.abHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sla-warn-pct">{t("sla.warnPct")}</Label>
              <Input
                id="sla-warn-pct"
                type="number"
                className="mt-1.5"
                min={THRESHOLD_LIMITS.slaWarnPct.min}
                max={THRESHOLD_LIMITS.slaWarnPct.max}
                disabled={!canWrite}
                value={ab.warn}
                onChange={(e) => setAb({ ...ab, warn: Math.trunc(Number(e.target.value)) })}
              />
            </div>
            <div>
              <Label htmlFor="sla-breach-pct">{t("sla.breachPct")}</Label>
              <Input
                id="sla-breach-pct"
                type="number"
                className="mt-1.5"
                min={THRESHOLD_LIMITS.slaBreachPct.min}
                max={THRESHOLD_LIMITS.slaBreachPct.max}
                disabled={!canWrite}
                value={ab.breach}
                onChange={(e) => setAb({ ...ab, breach: Math.trunc(Number(e.target.value)) })}
              />
            </div>
          </div>
          {reference && !abError ? (
            <p className="mt-3 text-xs text-zinc-600" data-testid="sla-ab-preview">
              {t("sla.abPreview", {
                window: Math.round(reference.firstResponseSeconds / 60),
                warn: slaScaledMinutes(reference.firstResponseSeconds, ab.warn),
                breach: slaScaledMinutes(reference.firstResponseSeconds, ab.breach),
              })}
            </p>
          ) : null}
          {abError ? (
            <p className="mt-3 text-xs font-medium text-rose-600" role="alert">
              {abError.reason === "warnAboveBreach"
                ? t("sla.warnAboveBreach")
                : t("thresholds.range", THRESHOLD_LIMITS[abError.key])}
            </p>
          ) : null}
        </div>

        {invalidWindow ? (
          <p className="text-xs font-medium text-rose-600" role="alert">
            {t("sla.invalidWindow")}
          </p>
        ) : null}
        <Button size="sm" disabled={!canWrite || saving || Boolean(abError) || invalidWindow} onClick={() => void save()}>
          {t("save")}
        </Button>
      </div>
    </QueryState>
  );
}
