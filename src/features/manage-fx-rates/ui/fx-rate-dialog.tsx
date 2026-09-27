"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CURRENCY_CODE,
  FX_RATE_EXISTS_CODE,
  FX_RATE_MAX_DECIMALS,
  fxRateError,
  normalizeCurrency,
  type FxRate,
  type FxRepository,
} from "@/entities/fx";
import { useCan } from "@/entities/viewer";
import { isApiError } from "@/shared/api/api-error";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  repository: FxRepository;
  /** Edit mode when set: only rate and source can change. */
  rate?: FxRate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (rate: FxRate) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export function FxRateDialog({ repository, rate, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("fx");
  const allowed = useCan("fx.manage");
  const feedback = useMutationFeedback();
  const [base, setBase] = useState(rate?.base ?? "");
  const [quote, setQuote] = useState(rate?.quote ?? "");
  const [value, setValue] = useState(rate?.rate ?? "");
  const [effectiveDate, setEffectiveDate] = useState(rate?.effectiveDate ?? today());
  const [source, setSource] = useState(rate?.source ?? "");
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const editing = Boolean(rate);
  const rateError = value ? fxRateError(value) : null;
  const baseCode = normalizeCurrency(base);
  const quoteCode = normalizeCurrency(quote);
  const pairError =
    !editing && baseCode && quoteCode
      ? !CURRENCY_CODE.test(baseCode) || !CURRENCY_CODE.test(quoteCode)
        ? "currency"
        : baseCode === quoteCode
          ? "samePair"
          : null
      : null;
  const ready =
    !busy &&
    !fxRateError(value) &&
    (editing || (CURRENCY_CODE.test(baseCode) && CURRENCY_CODE.test(quoteCode) && !pairError && effectiveDate));

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
        ? await repository.update(rate.id, { rate: value, source })
        : await repository.create({ base: baseCode, quote: quoteCode, rate: value, effectiveDate, source });
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
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-md" data-testid="fx-rate-dialog">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("editTitle", { pair: `${rate!.base}/${rate!.quote}` }) : t("createTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        {exists ? (
          <p
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900"
          >
            {t("exists")}
          </p>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fx-base">{t("fields.base")}</Label>
              <Input
                id="fx-base"
                dir="ltr"
                value={base}
                maxLength={3}
                disabled={editing || busy}
                onChange={(e) => setBase(e.target.value.toUpperCase())}
                placeholder="USD"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fx-quote">{t("fields.quote")}</Label>
              <Input
                id="fx-quote"
                dir="ltr"
                value={quote}
                maxLength={3}
                disabled={editing || busy}
                onChange={(e) => setQuote(e.target.value.toUpperCase())}
                placeholder="SAR"
                autoComplete="off"
              />
            </div>
          </div>
          {pairError ? <p className="-mt-2 text-xs text-red-600">{t(`errors.${pairError}`)}</p> : null}

          <div className="space-y-1.5">
            <Label htmlFor="fx-rate">{t("fields.rate")}</Label>
            <Input
              id="fx-rate"
              dir="ltr"
              inputMode="decimal"
              value={value}
              disabled={busy}
              onChange={(e) => setValue(e.target.value.replace(",", "."))}
              placeholder="3.75"
              autoComplete="off"
              data-testid="fx-rate-input"
            />
            <p className={rateError ? "text-xs text-red-600" : "text-xs text-zinc-500"}>
              {rateError
                ? t(`errors.${rateError}`, { max: FX_RATE_MAX_DECIMALS })
                : t("rateHint", { max: FX_RATE_MAX_DECIMALS })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fx-date">{t("fields.effectiveDate")}</Label>
              <Input
                id="fx-date"
                type="date"
                value={effectiveDate}
                disabled={editing || busy}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fx-source">{t("fields.source")}</Label>
              <Input
                id="fx-source"
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t("sourcePlaceholder")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!ready} data-testid="fx-rate-submit">
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
