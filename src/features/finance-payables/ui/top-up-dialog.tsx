"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Hash, PiggyBank } from "lucide-react";
import { ACCOUNT_LOOK, type Account, type FinanceRepository, type PayableSupplier } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, ChoiceCard, Field, IconInput, MoneyInput, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  supplier: PayableSupplier;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

/** Sends a deposit top-up to a prepaid supplier from a treasury account; both ledgers move together. */
export function TopUpDialog({ repository, supplier, accounts, open, onOpenChange, onDone }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const usable = useMemo(() => accounts.filter((a) => a.isActive && a.currency === supplier.currency), [accounts, supplier.currency]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAccountId(usable[0]?.id ?? "");
    const gap = supplier.lowBalanceThreshold * 2 - supplier.depositBalance;
    setAmount(gap > 0 ? minorToInput(gap) : "");
    setFee("");
    setReference("");
  }, [open, usable, supplier]);

  const account = usable.find((a) => a.id === accountId) ?? null;
  const minor = parseMoneyInput(amount);
  const feeMinor = fee.trim() ? parseMoneyInput(fee) : 0;
  const overdraw = Boolean(account && minor && feeMinor !== null && (account.kind === "cash" || account.kind === "wallet") && account.balance < minor + feeMinor);
  const valid = account !== null && Boolean(minor) && feeMinor !== null && !overdraw;

  async function submit() {
    if (!valid || !account || !minor || feeMinor === null || saving) return;
    setSaving(true);
    try {
      await repository.topUp(supplier.id, { accountId: account.id, amount: minor, fee: feeMinor, reference: reference.trim() });
      feedback.success(t("payables.toppedUp"));
      onDone();
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={PiggyBank}
      tone="sky"
      title={t("payables.topUpTitle", { name: supplier.name })}
      description={t("payables.topUpHint", { balance: formatMoney(supplier.depositBalance, locale, supplier.currency) })}
      testId="finance-topup-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-topup-submit">
            {saving ? t("saving") : t("payables.topUp")}
          </Button>
        </>
      }
    >
      <Field label={t("payables.fromAccount")} hint={usable.length === 0 ? t("payables.noAccount", { currency: supplier.currency }) : undefined}>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("amount")} htmlFor="tu-amount">
          <MoneyInput id="tu-amount" currency={supplier.currency} value={amount} onChange={setAmount} autoFocus data-testid="tu-amount" />
        </Field>
        <Field label={t("treasury.fee")} htmlFor="tu-fee">
          <MoneyInput id="tu-fee" currency={supplier.currency} value={fee} onChange={setFee} />
        </Field>
      </div>
      <Field label={t("treasury.reference")} htmlFor="tu-ref">
        <IconInput id="tu-ref" icon={Hash} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
      </Field>
      {overdraw ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.overdraw")}</p> : null}
    </ActionDialog>
  );
}
