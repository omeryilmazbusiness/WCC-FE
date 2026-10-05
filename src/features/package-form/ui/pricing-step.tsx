"use client";

import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeftRight, Calculator, Percent, Receipt, TrendingUp, Wand2 } from "lucide-react";
import {
  AGE_TIERS,
  COST_LINES,
  ROOM_TIERS,
  TIER_LOOK,
  costTotal,
  marginPct,
  roomOrderWarnings,
  suggestedPrice,
  type Costs,
} from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { Button, FormControl, FormField, FormItem, FormMessage, FormSection, TONES } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { FX_TARGETS, usePackageFx } from "../model/use-package-fx";
import { Field, MoneyInput, Stepper } from "./controls";

const minor = (v: string | undefined) => parseMoneyInput(v ?? "") ?? 0;

export function PricingStep() {
  const t = useTranslations("packages");
  const locale = useLocale();
  const { control, setValue } = useFormContext<PackageFormValues>();
  const [currency, prices, costInputs, markupPct] = useWatch({ control, name: ["baseCurrency", "prices", "costs", "spec.costs.markupPct"] });
  const fx = usePackageFx();

  const rows = ROOM_TIERS.map((r) => ({ code: r.code, kind: "room" as const, amount: minor(prices[r.code]), active: true }));
  const warnings = roomOrderWarnings(rows);
  const costs: Costs = { currency, markupPct, ...Object.fromEntries(COST_LINES.map((l) => [l, minor(costInputs[l])])) } as Costs;
  const net = costTotal(costs);
  const suggested = suggestedPrice(costs);
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

      <FormSection icon={Calculator} tone="amber" title={t("form.pricing.costs")} hint={t("form.pricing.costsHint", { currency })} testId="package-form-costs">
        <div className="grid gap-3 sm:grid-cols-3">
          {COST_LINES.map((line) => (
            <FormField
              key={line}
              control={control}
              name={`costs.${line}`}
              render={({ field }) => (
                <FormItem>
                  <span className="block text-[13px] font-semibold text-zinc-700">{t(`cost.${line}`)}</span>
                  <FormControl>
                    <MoneyInput {...field} currency={currency} aria-label={t(`cost.${line}`)} data-testid={`package-form-cost-${line}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
          <FormField
            control={control}
            name="spec.costs.markupPct"
            render={({ field }) => (
              <FormItem>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700">
                  <Percent className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                  {t("form.pricing.markup")}
                </span>
                <Stepper value={field.value} onChange={field.onChange} min={0} max={300} suffix="%" label={t("form.pricing.markup")} />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Figure label={t("form.pricing.total")} value={formatMoney(net, locale, currency)} tone="zinc" />
            <Figure
              label={t("form.pricing.suggested")}
              value={formatMoney(suggested, locale, currency)}
              tone="emerald"
              action={
                suggested > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 rounded-full px-2 text-[11.5px]"
                    onClick={() => setValue("prices.DOUBLE", minorToInput(suggested), { shouldDirty: true, shouldValidate: true })}
                    data-testid="package-form-apply-suggested"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden />
                    {t("form.pricing.apply")}
                  </Button>
                ) : null
              }
            />
          </div>
        </div>
        {net > 0 ? (
          <Field label={t("form.pricing.margin")}>
            <div className="flex flex-wrap gap-2">
              {ROOM_TIERS.map(({ code }) => {
                const price = minor(prices[code]);
                const m = marginPct(price, net);
                if (m === null) return null;
                const below = price < net;
                return (
                  <span
                    key={code}
                    className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold", below ? TONES.rose.soft : TONES.emerald.soft)}
                  >
                    <TrendingUp className={cn("h-3.5 w-3.5", below && "rotate-180")} aria-hidden />
                    {below ? t("form.pricing.belowCost", { tier: t(`tier.${code}`) }) : t("form.pricing.marginOf", { pct: m, tier: t(`tier.${code}`) })}
                  </span>
                );
              })}
            </div>
          </Field>
        ) : null}
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

function Figure({ label, value, tone, action }: { label: string; value: string; tone: "zinc" | "emerald"; action?: ReactNode }) {
  return (
    <div className={cn("rounded-[18px] p-3", tone === "emerald" ? "bg-emerald-50/80" : "bg-zinc-50")}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11.5px] font-semibold text-zinc-500">{label}</span>
        {action}
      </div>
      <p className={cn("mt-1 text-[18px] font-bold tabular-nums tracking-tight", tone === "emerald" ? "text-emerald-700" : "text-zinc-900")}>{value}</p>
    </div>
  );
}
