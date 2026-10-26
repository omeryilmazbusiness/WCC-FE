"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { canUpgradeTo, featuresOn, featureCap, type CompanyPlan } from "@/entities/company";
import { cn } from "@/shared/lib/cn";
import { Button, GlyphTile } from "@/shared/ui";
import { FEATURE_LOOK, PLAN_LOOK } from "./look";

type Props = {
  plan: CompanyPlan;
  current?: CompanyPlan;
  canRequest: boolean;
  highlighted?: boolean;
  onUpgrade: (next: CompanyPlan) => void;
};

/** One vertical package card: header, written feature list, then the action. */
export function MembershipPlanCard({ plan, current, canRequest, highlighted, onUpgrade }: Props) {
  const t = useTranslations("settings.membership");
  const tp = useTranslations("adminCompanies.plans");
  const look = PLAN_LOOK[plan];
  const Icon = look.icon;
  const mine = current === plan;
  const upgradable = Boolean(current && canUpgradeTo(current, plan));
  const features = featuresOn(plan);

  return (
    <article
      data-testid={`membership-card-${plan}`}
      aria-current={mine ? "true" : undefined}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[28px] bg-gradient-to-b ring-1 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]",
        look.shell,
        mine && "ring-2 ring-offset-2 ring-offset-zinc-50",
        highlighted && !mine && "lg:-translate-y-1",
      )}
    >
      <header className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <GlyphTile icon={Icon} tone={look.tone} size="xl" />
          <div className="flex flex-wrap justify-end gap-1.5">
            {mine ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden />
                {t("yourPlan")}
              </span>
            ) : null}
            {highlighted && !mine ? (
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", "bg-violet-50 text-violet-700 ring-violet-200")}>
                {t("bestValue")}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <h3 className={cn("text-[22px] font-bold tracking-tight", look.ink)}>{tp(`${plan}.name`)}</h3>
          <p className="mt-0.5 text-[13px] font-semibold text-zinc-600">{t(`plans.${plan}.tagline`)}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{t(`plans.${plan}.body`)}</p>
        </div>
      </header>

      <div className="flex-1 border-t border-zinc-100/80 px-5 py-4 sm:px-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("included")}</p>
        <ul className="space-y-3.5">
          {features.map((feature) => {
            const item = FEATURE_LOOK[feature.id];
            const cap = featureCap(plan, feature);
            return (
              <li key={feature.id} className="flex items-start gap-3" data-testid={`membership-feature-${plan}-${feature.id}`}>
                <GlyphTile icon={item.icon} tone={item.tone} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[14px] font-semibold text-zinc-950">{t(`features.${feature.id}.title`)}</span>
                    {cap ? (
                      <span className="text-[12px] font-semibold tabular-nums text-zinc-500">
                        {cap.kind === "unlimited" ? t("unlimited") : t(`caps.${feature.id}`, { n: cap.n })}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-zinc-500">{t(`features.${feature.id}.body`)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="mt-auto border-t border-zinc-100/80 px-5 py-4 sm:px-6">
        {mine ? (
          <p className="text-center text-[13px] font-semibold text-zinc-500" data-testid={`membership-current-${plan}`}>
            {t("onThisPlan")}
          </p>
        ) : upgradable && canRequest ? (
          <Button className="w-full" onClick={() => onUpgrade(plan)} data-testid={`membership-upgrade-${plan}`}>
            {t("upgrade")}
          </Button>
        ) : upgradable ? (
          <p className="text-center text-[12.5px] leading-snug text-zinc-500">{t("needSupport")}</p>
        ) : current ? (
          <p className="text-center text-[12.5px] text-zinc-400">{t("includedBelow")}</p>
        ) : (
          <p className="text-center text-[12.5px] text-zinc-400">{t("catalogOnly")}</p>
        )}
      </footer>
    </article>
  );
}
