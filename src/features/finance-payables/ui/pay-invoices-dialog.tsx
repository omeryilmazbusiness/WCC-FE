"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, CircleAlert, Landmark } from "lucide-react";
import { ACCOUNT_LOOK, type Account, type DueInvoice, type FinanceRepository } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, ChoiceCard, Field, MoneyInput, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  invoices: DueInvoice[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

type Outcome = { id: string; ok: boolean };

/**
 * Pays one or many supplier invoices of one currency from a single account. Each invoice is
 * its own server transaction, so a failure part-way leaves the paid ones paid and reports the rest.
 */
export function PayInvoicesDialog({ repository, invoices, accounts, open, onOpenChange, onDone }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const currency = invoices[0]?.currency ?? "";
  const sameCurrency = invoices.every((i) => i.currency === currency);
  const usable = useMemo(() => accounts.filter((a) => a.isActive && a.currency === currency), [accounts, currency]);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const [accountId, setAccountId] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  useEffect(() => {
    if (!open) return;
    setAccountId(usable[0]?.id ?? "");
    setFee("");
    setNote("");
    setOutcomes([]);
  }, [open, usable]);

  const account = usable.find((a) => a.id === accountId) ?? null;
  const feeMinor = fee.trim() ? parseMoneyInput(fee) : 0;
  const overdraw = Boolean(account && feeMinor !== null && (account.kind === "cash" || account.kind === "wallet") && account.balance < total + feeMinor * invoices.length);
  const done = outcomes.length > 0;
  const valid = sameCurrency && invoices.length > 0 && account !== null && feeMinor !== null && !overdraw && !done;

  async function submit() {
    if (!valid || !account || feeMinor === null || busy) return;
    setBusy(true);
    const results: Outcome[] = [];
    for (const inv of invoices) {
      try {
        await repository.payInvoice(inv.id, { accountId: account.id, fee: feeMinor, note: note.trim() });
        results.push({ id: inv.id, ok: true });
      } catch (e) {
        results.push({ id: inv.id, ok: false });
        if (invoices.length === 1) feedback.error(e, t("saveError"));
      }
    }
    setOutcomes(results);
    setBusy(false);
    const paid = results.filter((r) => r.ok).length;
    if (paid > 0) {
      feedback.success(t("payables.paid", { count: paid }));
      onDone();
    }
    if (paid === invoices.length) onOpenChange(false);
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Landmark}
      tone="amber"
      size="lg"
      title={invoices.length === 1 ? t("payables.payOne", { number: invoices[0].invoiceNumber }) : t("payables.payMany", { count: invoices.length })}
      description={t("payables.payHint")}
      testId="finance-pay-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {done ? t("close") : tc("cancel")}
          </Button>
          {done ? null : (
            <Button disabled={!valid || busy} onClick={() => void submit()} data-testid="finance-pay-submit">
              {busy ? t("saving") : t("payables.payTotal", { amount: formatMoney(total, locale, currency) })}
            </Button>
          )}
        </>
      }
    >
      {!sameCurrency ? <p className="text-[13px] font-semibold text-rose-700">{t("payables.mixedCurrency")}</p> : null}
      <ul className="divide-y divide-zinc-100 rounded-[20px] border border-zinc-100 px-3">
        {invoices.map((i) => {
          const o = outcomes.find((x) => x.id === i.id);
          return (
            <li key={i.id} className="flex items-center gap-3 py-2.5 text-[13px]">
              {o ? o.ok ? <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden /> : <CircleAlert className="h-4 w-4 text-rose-600" aria-hidden /> : null}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-zinc-900">{i.supplierName}</span> <span className="text-zinc-500">· {i.invoiceNumber}</span>
              </span>
              <span className="font-semibold tabular-nums text-zinc-900">{formatMoney(i.amount, locale, i.currency)}</span>
            </li>
          );
        })}
      </ul>
      {outcomes.some((o) => !o.ok) ? <p className="text-[12.5px] font-semibold text-rose-700">{t("payables.someFailed")}</p> : null}
      <Field label={t("payables.fromAccount")} hint={usable.length === 0 ? t("payables.noAccount", { currency }) : undefined}>
        <div className="grid gap-2 sm:grid-cols-2">
          {usable.map((a) => (
            <ChoiceCard
              key={a.id}
              selected={accountId === a.id}
              onSelect={() => setAccountId(a.id)}
              icon={ACCOUNT_LOOK[a.kind].icon}
              tone={ACCOUNT_LOOK[a.kind].tone}
              label={a.name}
              hint={formatMoney(a.balance, locale, a.currency)}
            />
          ))}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <Field label={t("payables.feeEach")} htmlFor="pay-fee">
          <MoneyInput id="pay-fee" currency={currency || "—"} value={fee} onChange={setFee} />
        </Field>
        <Field label={t("treasury.note")} htmlFor="pay-note">
          <Textarea id="pay-note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </div>
      {overdraw ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.overdraw")}</p> : null}
    </ActionDialog>
  );
}
