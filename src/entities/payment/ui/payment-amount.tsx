"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { dualAmountState } from "../lib/finance";

type Props = {
  amount: number;
  currency: string;
  amountReporting: number | null;
  reportingCurrency: string;
  fxMissing?: boolean;
  className?: string;
};

/** Original amount, plus the reporting-currency amount or an "FX rate missing" badge. */
export function PaymentAmount({
  amount,
  currency,
  amountReporting,
  reportingCurrency,
  fxMissing,
  className,
}: Props) {
  const t = useTranslations("fx");
  const locale = useLocale();
  const state = dualAmountState({ currency, amountReporting, reportingCurrency, fxMissing });
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <bdi>{formatMoney(amount, locale, currency)}</bdi>
      {state === "dual" && amountReporting !== null ? (
        <span className="text-xs font-medium text-zinc-500" data-testid="payment-amount-reporting">
          ≈ <bdi>{formatMoney(amountReporting, locale, reportingCurrency)}</bdi>
        </span>
      ) : null}
      {state === "missing" ? (
        <span
          className="rounded-lg bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200"
          title={reportingCurrency ? t("missingHint", { from: currency, to: reportingCurrency }) : undefined}
          data-testid="payment-fx-missing"
        >
          {t("missing")}
        </span>
      ) : null}
    </span>
  );
}
