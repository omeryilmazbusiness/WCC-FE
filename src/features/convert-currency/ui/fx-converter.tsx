"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";
import {
  CURRENCY_CODE,
  FX_RATE_NOT_FOUND_CODE,
  formatFxRate,
  normalizeCurrency,
  type FxConversion,
  type FxRepository,
} from "@/entities/fx";
import { isApiError } from "@/shared/api/api-error";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { Button, Input, Label, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FxRepository;
  defaultFrom?: string;
  defaultTo?: string;
};

export function FxConverter({ repository, defaultFrom = "USD", defaultTo = "SAR" }: Props) {
  const t = useTranslations("fx.converter");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [on, setOn] = useState("");
  const [result, setResult] = useState<FxConversion | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const minor = parseMoneyInput(amount);
  const fromCode = normalizeCurrency(from);
  const toCode = normalizeCurrency(to);
  const ready = !busy && minor !== null && CURRENCY_CODE.test(fromCode) && CURRENCY_CODE.test(toCode);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || minor === null) return;
    setBusy(true);
    setNotFound(false);
    try {
      setResult(await repository.convert({ amount: minor, from: fromCode, to: toCode, on: on || undefined }));
    } catch (err) {
      setResult(null);
      if (isApiError(err) && err.status === 404 && err.code === FX_RATE_NOT_FOUND_CODE) setNotFound(true);
      else feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-4 rounded-[24px] border border-zinc-200/80 bg-white p-5"
      data-testid="fx-converter"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-950">{t("title")}</p>
        <p className="mt-1 text-xs text-zinc-500">{t("hint")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="fx-conv-amount">{t("amount")}</Label>
          <Input
            id="fx-conv-amount"
            dir="ltr"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={amount !== "" && minor === null}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-conv-from">{t("from")}</Label>
          <Input
            id="fx-conv-from"
            dir="ltr"
            maxLength={3}
            value={from}
            onChange={(e) => setFrom(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-conv-to">{t("to")}</Label>
          <Input
            id="fx-conv-to"
            dir="ltr"
            maxLength={3}
            value={to}
            onChange={(e) => setTo(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx-conv-on">{t("on")}</Label>
          <Input id="fx-conv-on" type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={!ready}>
            <ArrowLeftRight className="h-4 w-4 rtl:-scale-x-100" />
            {t("convert")}
          </Button>
        </div>
      </div>

      {notFound ? (
        <p role="alert" className="text-sm font-medium text-amber-800">
          {t("notFound", { from: fromCode, to: toCode })}
        </p>
      ) : null}
      {result ? (
        <div className="rounded-2xl bg-zinc-50 p-4" aria-live="polite" data-testid="fx-conversion-result">
          <p className="text-lg font-semibold text-zinc-950">
            <bdi>{formatMoney(result.amount, locale, result.from)}</bdi> ={" "}
            <bdi>{formatMoney(result.converted, locale, result.to)}</bdi>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("rateLine", {
              rate: formatFxRate(result.rate),
              date: result.effectiveDate ? formatDay(result.effectiveDate, locale) : "—",
            })}
          </p>
        </div>
      ) : null}
    </form>
  );
}
