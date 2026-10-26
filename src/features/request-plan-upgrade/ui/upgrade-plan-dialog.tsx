"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { PLAN_CATALOG } from "@/entities/company/plan";
import { ActionDialog, Button, useMutationFeedback } from "@/shared/ui";
import { requestPlanUpgrade } from "../api";
import { upgradeFeatureName, type UpgradeTarget } from "../model/target";

type Props = {
  target: UpgradeTarget | null;
  onClose: () => void;
};

export function UpgradePlanDialog({ target, onClose }: Props) {
  const t = useTranslations("planUpgrade");
  const tn = useTranslations("nav");
  const tp = useTranslations("adminCompanies.plans");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);
  const open = target !== null;
  const limits = target ? PLAN_CATALOG[target.next].limits : null;
  const feature = target ? upgradeFeatureName(target, tn) : "";

  async function submit() {
    if (!target) return;
    setBusy(true);
    try {
      const out = await requestPlanUpgrade({
        target: target.next,
        feature,
        locale,
      });
      feedback.success(out.duplicate ? t("already") : t("sent"));
      onClose();
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
      icon={Sparkles}
      tone="violet"
      title={t("title")}
      description={target ? t("subtitle", { feature }) : undefined}
      testId="plan-upgrade-dialog"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy} data-testid="plan-upgrade-submit">
            {busy ? t("sending") : t("confirm")}
          </Button>
        </>
      }
    >
      {target && limits ? (
        <div className="space-y-3 text-[13.5px] leading-6 text-zinc-600">
          <p>
            {t("current", { plan: tp(`${target.current}.name`) })} · {t("next", { plan: tp(`${target.next}.name`) })}
          </p>
          <p>{tp(`${target.next}.blurb`)}</p>
          <ul className="list-disc ps-5 text-[13px] text-zinc-500">
            <li>{tp("seats", { n: limits.users > 0 ? String(limits.users) : tp("unlimited") })}</li>
            <li>{tp("branches", { n: limits.branches > 0 ? String(limits.branches) : tp("unlimited") })}</li>
            <li>{tp("ai", { n: limits.aiPerDay > 0 ? String(limits.aiPerDay) : tp("unlimited") })}</li>
          </ul>
          <p className="text-zinc-500">{t("notice")}</p>
        </div>
      ) : null}
    </ActionDialog>
  );
}
