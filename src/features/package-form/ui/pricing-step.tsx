"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeftRight, Receipt } from "lucide-react";
import { AGE_TIERS, ROOM_TIERS, TIER_LOOK, roomOrderWarnings } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { FormControl, FormField, FormItem, FormMessage, FormSection, TONES } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { FX_TARGETS, usePackageFx } from "../model/use-package-fx";
import { MoneyInput } from "./controls";

const minor = (v: string | undefined) => parseMoneyInput(v ?? "") ?? 0;

export function PricingStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const [currency, prices] = useWatch({ control, name: ["baseCurrency", "prices"] });
  const fx = usePackageFx();

  const rows = ROOM_TIERS.map((r) => ({ code: r.code, kind: "room" as const, amount: minor(prices[r.code]), active: true }));
  const warnings = roomOrderWarnings(rows);
  const targets = FX_TARGETS.filter((c) => c !== currency);

  return (
    <div className="space-y-3.5">
      <FormSection
        icon={Receipt}
        tone="emerald"
        title={t("form.pricing.matrix")}
        hint={t("form.pricing.matrixHint", { currency })}
        testId="package-form-matrix"
        aside={
          <span
            className={cn("hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline-flex", fx.ready ? TONES.emerald.soft : TONES.zinc.soft)}
            title={fx.ready ? t("form.pricing.convertHint") : t("form.pricing.fxUnavailable")}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
            {t("form.pricing.convert")}
          </span>
        }
      >
        <TierGroup label={t("form.pricing.rooms")} codes={ROOM_TIERS.map((r) => r.code)} targets={targets} fx={fx} />
        {warnings.length ? (
          <p className="flex items-center gap-1.5 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-amber-800" role="status">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {t("form.pricing.orderWarning", { tiers: warnings.map((c) => t(`tier.${c}`)).join(", ") })}
          </p>
        ) : null}
        <TierGroup label={t("form.pricing.ages")} codes={AGE_TIERS.map((r) => r.code)} targets={targets} fx={fx} />
      </FormSection>
    </div>
  );
}

function TierGroup({
  label,
  codes,
  targets,
  fx,
}: {
  label: string;
  codes: readonly string[];
  targets: readonly string[];
  fx: ReturnType<typeof usePackageFx>;
}) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const { control } = useFormContext<PackageFormValues>();
  const currency = useWatch({ control, name: "baseCurrency" });
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[20px] bg-zinc-50/70 ring-1 ring-inset ring-zinc-900/[0.04]">
        {codes.map((code) => {
          const Icon = TIER_LOOK[code];
          return (
            <FormField
              key={code}
              control={control}
              name={`prices.${code}`}
              render={({ field }) => {
                const amount = minor(field.value);
                return (
                  <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", TONES.emerald.soft)} aria-hidden>
                        {Icon ? <Icon className="h-5 w-5" strokeWidth={2.1} /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-zinc-900">{t(`tier.${code}`)}</span>
                        <span className="block truncate text-[11.5px] font-medium text-zinc-500">{t(`tierHint.${code}`)}</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:w-[260px]">
                      <FormItem>
                        <FormControl>
                          <MoneyInput {...field} currency={currency} aria-label={t(`tier.${code}`)} data-testid={`package-form-price-${code}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      {amount > 0 ? (
                        <div className="flex flex-wrap gap-1.5" aria-live="polite">
                          {targets.map((to) => {
                            const v = fx.convert(amount, currency, to);
                            return v === null ? null : (
                              <span key={to} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-500 ring-1 ring-zinc-200/80">
                                ≈ {formatMoney(v, locale, to)}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
