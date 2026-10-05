"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpDown, CalendarDays, Calculator, Loader2 } from "lucide-react";
import {
  CURRENCY_CODE,
  CurrencyBadge,
  FX_RATE_NOT_FOUND_CODE,
  formatFxRate,
  normalizeCurrency,
  type FxConversion,
  type FxRepository,
} from "@/entities/fx";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { TONES } from "@/shared/ui";

const CONVERT_DEBOUNCE_MS = 450;

type Props = {
  repository: FxRepository;
  defaultFrom?: string;
  defaultTo?: string;
  /** Suggested codes for the currency pickers. */
  currencies?: readonly string[];
  className?: string;
};

type Outcome = { kind: "idle" } | { kind: "ok"; result: FxConversion } | { kind: "missing" } | { kind: "error" };

/** Converts with the stored accounting rates as the user types. */
export function FxConverter({ repository, defaultFrom = "USD", defaultTo = "SAR", currencies = [], className }: Props) {
  const t = useTranslations("fx.converter");
  const locale = useLocale();
  const listId = useId();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [on, setOn] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const request = useRef(0);

  const minor = parseMoneyInput(amount);
  const fromCode = normalizeCurrency(from);
  const toCode = normalizeCurrency(to);
  const valid = minor !== null && CURRENCY_CODE.test(fromCode) && CURRENCY_CODE.test(toCode) && fromCode !== toCode;
  const key = valid ? [minor, fromCode, toCode, on].join("|") : "";
  const settledKey = useDebouncedValue(key, CONVERT_DEBOUNCE_MS);

  useEffect(() => {
    const id = ++request.current;
    if (!settledKey) {
      setBusy(false);
      setOutcome({ kind: "idle" });
      return;
    }
    const [amountMinor, base, quote, day] = settledKey.split("|");
    setBusy(true);
    repository
      .convert({ amount: Number(amountMinor), from: base, to: quote, on: day || undefined })
      .then(
        (result) => id === request.current && setOutcome({ kind: "ok", result }),
        (err: unknown) => {
          if (id !== request.current) return;
          const missing = isApiError(err) && err.status === 404 && err.code === FX_RATE_NOT_FOUND_CODE;
          setOutcome({ kind: missing ? "missing" : "error" });
        },
      )
      .finally(() => id === request.current && setBusy(false));
  }, [repository, settledKey]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const result = outcome.kind === "ok" ? outcome.result : null;
  const resultMatches = result && result.from === fromCode && result.to === toCode;

  return (
    <section
      aria-labelledby={`${listId}-title`}
      className={cn("rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}
      data-testid="fx-converter"
    >
      <header className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", TONES.indigo.gradient)} aria-hidden>
          <Calculator className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <h2 id={`${listId}-title`} className="text-[16px] font-semibold tracking-tight text-zinc-950">
            {t("title")}
          </h2>
          <p className="truncate text-[12.5px] text-zinc-500">{t("hint")}</p>
        </div>
      </header>

      <div className="mt-4">
        <div className="relative space-y-1.5">
          <div className="rounded-[22px] bg-zinc-50 px-4 py-3.5 ring-1 ring-inset ring-zinc-900/[0.04]">
            <label htmlFor={`${listId}-amount`} className="text-[12px] font-medium text-zinc-500">
              {t("amount")}
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id={`${listId}-amount`}
                dir="ltr"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amount !== "" && minor === null}
                className="min-w-0 flex-1 bg-transparent text-[28px] font-semibold tabular-nums tracking-tight text-zinc-950 outline-none placeholder:text-zinc-300 aria-[invalid=true]:text-rose-600"
                placeholder="0"
                data-testid="fx-conv-amount"
              />
              <CurrencyPill id={`${listId}-from`} label={t("from")} value={from} onChange={setFrom} listId={`${listId}-codes`} />
            </div>
          </div>

          <button
            type="button"
            onClick={swap}
            aria-label={t("swap")}
            title={t("swap")}
            className="absolute start-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-zinc-900 text-white shadow-md transition-transform duration-300 hover:rotate-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rtl:translate-x-1/2"
            data-testid="fx-conv-swap"
          >
            <ArrowUpDown className="h-4 w-4" strokeWidth={2.4} />
          </button>

          <div className="rounded-[22px] bg-zinc-50 px-4 py-3.5 ring-1 ring-inset ring-zinc-900/[0.04]">
            <span className="text-[12px] font-medium text-zinc-500">{t("result")}</span>
            <div className="mt-1 flex items-center gap-3">
              <output
                htmlFor={`${listId}-amount ${listId}-from ${listId}-to`}
                aria-live="polite"
                className={cn(
                  "min-w-0 flex-1 truncate text-[28px] font-semibold tabular-nums tracking-tight transition-opacity",
                  resultMatches ? "text-zinc-950" : "text-zinc-300",
                  busy && "opacity-50",
                )}
                data-testid="fx-conversion-result"
              >
                <bdi dir="ltr">{resultMatches ? formatMoney(result.converted, locale, result.to) : "—"}</bdi>
              </output>
              <CurrencyPill id={`${listId}-to`} label={t("to")} value={to} onChange={setTo} listId={`${listId}-codes`} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="relative flex h-9 items-center gap-2 rounded-full bg-zinc-100 ps-3 pe-1 text-[12.5px] font-medium text-zinc-700">
            <CalendarDays className="h-4 w-4 text-zinc-500" strokeWidth={2} aria-hidden />
            <span className="sr-only">{t("on")}</span>
            <input
              type="date"
              value={on}
              onChange={(e) => setOn(e.target.value)}
              className="h-7 bg-transparent pe-2 text-[12.5px] outline-none"
              aria-label={t("on")}
              data-testid="fx-conv-on"
            />
          </label>
          <p className="min-h-5 text-end text-[12.5px] text-zinc-500" role="status">
            {busy ? (
              <Loader2 className="inline h-3.5 w-3.5 animate-spin" aria-label={t("converting")} />
            ) : outcome.kind === "missing" ? (
              <span className="font-medium text-amber-700">{t("notFound", { from: fromCode, to: toCode })}</span>
            ) : outcome.kind === "error" ? (
              <span className="font-medium text-rose-700">{t("error")}</span>
            ) : resultMatches ? (
              <bdi>
                {t("rateLine", {
                  rate: `1 ${result.from} = ${formatFxRate(result.rate)} ${result.to}`,
                  date: result.effectiveDate ? formatDay(result.effectiveDate, locale) : "—",
                })}
              </bdi>
            ) : fromCode === toCode && CURRENCY_CODE.test(fromCode) ? (
              t("samePair")
            ) : null}
          </p>
        </div>

        <datalist id={`${listId}-codes`}>
          {currencies.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
      </div>
    </section>
  );
}

function CurrencyPill({
  id,
  label,
  value,
  onChange,
  listId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  listId: string;
}) {
  const code = normalizeCurrency(value);
  return (
    <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white ps-1.5 pe-3 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_0_0_0.5px_rgba(15,23,42,0.06)]">
      <CurrencyBadge code={CURRENCY_CODE.test(code) ? code : "?"} size="sm" className="ring-0" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        dir="ltr"
        maxLength={3}
        autoComplete="off"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-[3.25rem] bg-transparent text-[15px] font-semibold uppercase tracking-wide text-zinc-900 outline-none"
      />
    </span>
  );
}
