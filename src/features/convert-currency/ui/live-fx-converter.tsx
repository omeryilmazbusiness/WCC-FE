"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpDown, ChevronsUpDown } from "lucide-react";
import {
  divideDecimal,
  formatDecimalString,
  isPositiveDecimal,
  multiplyDecimal,
  normalizeDecimalInput,
  usableMid,
  type FxLiveKind,
  type FxLiveQuote,
} from "@/entities/fx-live";
import { toIntlLocale } from "@/shared/lib/format";

type Props = {
  quotes: readonly FxLiveQuote[];
  kind: FxLiveKind;
  /** Currency the quotes are expressed in (rates are `localCurrency` per 1 unit). */
  localCurrency: string;
};

/** Indicative amount ↔ local currency at the live mid of `kind` (exact decimal math). */
export function LiveFxConverter({ quotes, kind, localCurrency }: Props) {
  const t = useTranslations("fxLive.converter");
  const tk = useTranslations("fxLive.kindShort");
  const locale = useLocale();
  const intl = toIntlLocale(locale);
  const id = useId();
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [toLocal, setToLocal] = useState(true);

  const options = quotes.filter((q) => usableMid(q, kind)).map((q) => q.currency);
  const selected = options.includes(currency) ? currency : (options[0] ?? "");
  const mid = usableMid(quotes.find((q) => q.currency === selected), kind);
  const value = normalizeDecimalInput(amount);
  const valid = isPositiveDecimal(value);
  const result =
    valid && mid ? (toLocal ? multiplyDecimal(value, mid, 2) : divideDecimal(value, mid, 2)) : null;

  if (options.length === 0) return null;

  const picker = (
    <div className="relative shrink-0">
      <label htmlFor={`${id}-currency`} className="sr-only">
        {t("currency")}
      </label>
      <span
        aria-hidden
        dir="ltr"
        className="pointer-events-none flex h-8 items-center gap-1 rounded-full bg-zinc-900/[0.06] ps-3 pe-2 text-[13px] font-semibold text-zinc-900"
      >
        {selected}
        <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
      </span>
      <select
        id={`${id}-currency`}
        value={selected}
        onChange={(e) => setCurrency(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  );
  const localTag = (
    <span dir="ltr" className="flex h-8 shrink-0 items-center rounded-full bg-zinc-900/[0.06] px-3 text-[13px] font-semibold text-zinc-900">
      {localCurrency}
    </span>
  );

  return (
    <div className="liquid-glass-group relative rounded-2xl" data-testid="fx-live-converter">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <label htmlFor={`${id}-amount`} className="sr-only">
          {t("amount", { currency: toLocal ? selected : localCurrency })}
        </label>
        <input
          id={`${id}-amount`}
          dir="ltr"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={amount !== "" && !valid}
          className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold tabular-nums tracking-tight text-zinc-950 outline-none placeholder:text-zinc-300 aria-[invalid=true]:text-rose-600"
        />
        {toLocal ? picker : localTag}
      </div>

      <div className="relative h-px bg-zinc-900/[0.07]">
        <button
          type="button"
          aria-label={t("swap")}
          title={t("swap")}
          aria-pressed={!toLocal}
          onClick={() => setToLocal((v) => !v)}
          className="absolute start-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-700 shadow-[0_1px_3px_rgba(15,23,42,0.14),0_0_0_0.5px_rgba(15,23,42,0.08)] transition-transform hover:text-zinc-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rtl:translate-x-1/2"
        >
          <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex items-center gap-3 px-3.5 py-2.5" aria-live="polite" data-testid="fx-live-converter-result">
        <p className="min-w-0 flex-1 truncate text-[20px] font-semibold tabular-nums tracking-tight text-zinc-950">
          {result ? <bdi>{formatDecimalString(result, intl)}</bdi> : (
            <span className="text-sm font-normal text-zinc-400">{t(valid ? "unavailable" : "invalid")}</span>
          )}
        </p>
        {toLocal ? localTag : picker}
      </div>
      <p className="px-3.5 pb-2.5 text-[11px] text-zinc-400">{t("hint", { kind: tk(kind) })}</p>
    </div>
  );
}
