"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Banknote, CalendarDays, Coins, Hash, Pencil, Plus, ScrollText, TriangleAlert } from "lucide-react";
import {
  CURRENCY_CODE,
  CurrencyPairBadge,
  FX_RATE_EXISTS_CODE,
  FX_RATE_MAX_DECIMALS,
  formatFxRate,
  fxRateError,
  invertRate,
  localToday,
  normalizeCurrency,
  type FxRate,
  type FxRepository,
} from "@/entities/fx";
import { useCan } from "@/entities/viewer";
import { isApiError } from "@/shared/api/api-error";
import { ActionDialog, Button, Field, IconInput, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FxRepository;
  /** Edit mode when set: only rate and source can change. */
  rate?: FxRate;
  /** Pre-filled pair for a new rate. */
  defaults?: { base?: string; quote?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (rate: FxRate) => void;
};

export function FxRateDialog({ repository, rate, defaults, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("fx");
  const allowed = useCan("fx.manage");
  const feedback = useMutationFeedback();
  const [base, setBase] = useState(rate?.base ?? defaults?.base ?? "");
  const [quote, setQuote] = useState(rate?.quote ?? defaults?.quote ?? "");
  const [value, setValue] = useState(rate?.rate ? formatFxRate(rate.rate) : "");
  const [effectiveDate, setEffectiveDate] = useState(rate?.effectiveDate ?? localToday());
  const [source, setSource] = useState(rate?.source ?? "");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const editing = Boolean(rate);
  const rateError = value ? fxRateError(value) : null;
  const baseCode = normalizeCurrency(base);
  const quoteCode = normalizeCurrency(quote);
  const pairValid = CURRENCY_CODE.test(baseCode) && CURRENCY_CODE.test(quoteCode);
  const pairError =
    !editing && baseCode.length === 3 && quoteCode.length === 3
      ? !pairValid
        ? "currency"
        : baseCode === quoteCode
          ? "samePair"
          : null
      : null;
  const ready =
    !busy && !fxRateError(value) && (editing || (pairValid && !pairError && Boolean(effectiveDate)));
  const preview = pairValid && !pairError && !fxRateError(value) ? value.trim() : null;
  const inverse = preview ? invertRate(preview, 6) : null;

  function change(next: boolean) {
    if (!busy) onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setExists(false);
    try {
      const saved = rate
        ? await repository.update(rate.id, { rate: value.trim(), source: source.trim() })
        : await repository.create({ base: baseCode, quote: quoteCode, rate: value.trim(), effectiveDate, source: source.trim() });
      feedback.success(editing ? t("updated") : t("created"));
      setBusy(false);
      onOpenChange(false);
      onSaved(saved);
    } catch (err) {
      setBusy(false);
      if (isApiError(err) && err.status === 409 && err.code === FX_RATE_EXISTS_CODE) setExists(true);
      else feedback.error(err, t("saveError"));
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={change}
      icon={editing ? Pencil : Plus}
      tone={editing ? "indigo" : "emerald"}
      title={editing ? t("editTitle", { pair: `${rate!.base}/${rate!.quote}` }) : t("createTitle")}
      description={t("dialogDescription")}
      testId="fx-rate-dialog"
      footer={
        <>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="fx-rate-form" disabled={!ready} data-testid="fx-rate-submit">
            {t("save")}
          </Button>
        </>
      }
    >
      <form id="fx-rate-form" onSubmit={(e) => void submit(e)} className="space-y-4">
        {exists ? (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[13px] font-medium text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t("exists")}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("fields.base")} htmlFor="fx-base">
            <IconInput
              id="fx-base"
              icon={Banknote}
              dir="ltr"
              value={base}
              maxLength={3}
              disabled={editing || busy}
              onChange={(e) => setBase(e.target.value.toUpperCase())}
              placeholder="USD"
              autoComplete="off"
              className="font-semibold uppercase tracking-wide"
            />
          </Field>
          <Field label={t("fields.quote")} htmlFor="fx-quote">
            <IconInput
              id="fx-quote"
              icon={Coins}
              dir="ltr"
              value={quote}
              maxLength={3}
              disabled={editing || busy}
              onChange={(e) => setQuote(e.target.value.toUpperCase())}
              placeholder="SAR"
              autoComplete="off"
              className="font-semibold uppercase tracking-wide"
            />
          </Field>
        </div>
        {pairError ? (
          <p role="alert" className="-mt-2 text-[12px] font-medium text-rose-600">
            {t(`errors.${pairError}`)}
          </p>
        ) : null}

        <Field label={t("fields.rate")} htmlFor="fx-rate">
          <IconInput
            id="fx-rate"
            icon={Hash}
            dir="ltr"
            inputMode="decimal"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value.replace(",", "."))}
            placeholder="3.75"
            autoComplete="off"
            aria-invalid={Boolean(rateError)}
            aria-describedby="fx-rate-hint"
            className="text-[17px] font-semibold tabular-nums"
            data-testid="fx-rate-input"
          />
          <p id="fx-rate-hint" className={rateError ? "text-[12px] font-medium text-rose-600" : "text-[12px] text-zinc-400"}>
            {rateError ? t(`errors.${rateError}`, { max: FX_RATE_MAX_DECIMALS }) : t("rateHint", { max: FX_RATE_MAX_DECIMALS })}
          </p>
        </Field>

        {preview ? (
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="fx-rate-preview">
            <CurrencyPairBadge base={baseCode} quote={quoteCode} size="sm" />
            <div className="min-w-0 flex-1 text-[13px]" dir="ltr">
              <p className="truncate font-semibold tabular-nums text-zinc-900">
                1 {baseCode} = {formatFxRate(preview)} {quoteCode}
              </p>
              {inverse ? (
                <p className="truncate tabular-nums text-zinc-500">
                  1 {quoteCode} ≈ {formatFxRate(inverse)} {baseCode}
                </p>
              ) : null}
            </div>
            <ArrowLeftRight className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("fields.effectiveDate")} htmlFor="fx-date">
            <IconInput
              id="fx-date"
              icon={CalendarDays}
              type="date"
              value={effectiveDate}
              disabled={editing || busy}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </Field>
          <Field label={t("fields.source")} htmlFor="fx-source">
            <IconInput
              id="fx-source"
              icon={ScrollText}
              value={source}
              maxLength={120}
              disabled={busy}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("sourcePlaceholder")}
            />
          </Field>
        </div>
      </form>
    </ActionDialog>
  );
}
