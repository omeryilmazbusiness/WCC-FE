"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Coins, CreditCard, Landmark, Percent, Tag } from "lucide-react";
import { ACCOUNT_KINDS, ACCOUNT_LOOK, bpsToPercent, percentToBps, type Account, type AccountKind, type FinanceRepository } from "@/entities/finance";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, ChoiceGrid, Field, IconInput, MoneyInput, SwitchRow, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (a: Account) => void;
};

const CURRENCY = /^[A-Z]{3}$/;

/** Creates or edits a till, bank, POS or wallet account. Kind and currency are fixed once created. */
export function AccountDialog({ repository, account, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [kind, setKind] = useState<AccountKind>("bank");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [commission, setCommission] = useState("");
  const [threshold, setThreshold] = useState("");
  const [opening, setOpening] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(account?.kind ?? "bank");
    setName(account?.name ?? "");
    setCurrency(account?.currency ?? "SAR");
    setBankName(account?.bankName ?? "");
    setIban(account?.iban ?? "");
    setCommission(account?.commissionBps ? String(bpsToPercent(account.commissionBps)) : "");
    setThreshold(account?.lowBalanceThreshold ? minorToInput(account.lowBalanceThreshold) : "");
    setOpening("");
    setActive(account?.isActive ?? true);
  }, [open, account]);

  const bps = commission.trim() ? percentToBps(commission) : 0;
  const low = threshold.trim() ? parseMoneyInput(threshold) : 0;
  const openingMinor = opening.trim() ? parseMoneyInput(opening) : 0;
  const valid = name.trim().length > 0 && CURRENCY.test(currency) && bps !== null && low !== null && openingMinor !== null;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const input = {
        kind,
        name: name.trim(),
        currency,
        bankName: bankName.trim(),
        iban: iban.replace(/\s+/g, "").toUpperCase(),
        commissionBps: kind === "pos" ? (bps ?? 0) : 0,
        lowBalanceThreshold: low ?? 0,
        isActive: active,
        openingBalance: account ? undefined : (openingMinor ?? 0),
      };
      const saved = account ? await repository.updateAccount(account.id, input) : await repository.createAccount(input);
      feedback.success(t("treasury.accountSaved"));
      onSaved(saved);
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
      icon={Landmark}
      tone="indigo"
      size="lg"
      title={account ? t("treasury.editAccount") : t("treasury.newAccount")}
      description={t("treasury.accountHint")}
      testId="finance-account-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-account-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      {account ? null : (
        <ChoiceGrid
          name="account-kind"
          columns={2}
          value={kind}
          onChange={setKind}
          options={ACCOUNT_KINDS.map((k) => ({ value: k, label: t(`accountKind.${k}`), ...ACCOUNT_LOOK[k] }))}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={t("treasury.name")} htmlFor="acc-name">
          <IconInput id="acc-name" icon={Tag} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus data-testid="acc-name" />
        </Field>
        <Field label={t("currency")} htmlFor="acc-cur">
          <IconInput
            id="acc-cur"
            icon={Coins}
            dir="ltr"
            value={currency}
            disabled={Boolean(account)}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
            data-testid="acc-currency"
          />
        </Field>
      </div>
      {kind === "bank" || kind === "pos" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("treasury.bankName")} htmlFor="acc-bank">
            <IconInput id="acc-bank" icon={Building2} value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="IBAN" htmlFor="acc-iban">
            <IconInput id="acc-iban" icon={CreditCard} dir="ltr" value={iban} onChange={(e) => setIban(e.target.value)} maxLength={42} />
          </Field>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {kind === "pos" ? (
          <Field label={t("treasury.commission")} htmlFor="acc-bps" hint={t("treasury.commissionHint")}>
            <IconInput id="acc-bps" icon={Percent} inputMode="decimal" dir="ltr" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="1.75" />
          </Field>
        ) : null}
        <Field label={t("treasury.lowThreshold")} htmlFor="acc-low" hint={t("treasury.lowThresholdHint")}>
          <MoneyInput id="acc-low" currency={currency || "—"} value={threshold} onChange={setThreshold} />
        </Field>
        {account ? null : (
          <Field label={t("treasury.opening")} htmlFor="acc-open">
            <MoneyInput id="acc-open" currency={currency || "—"} value={opening} onChange={setOpening} />
          </Field>
        )}
      </div>
      {account ? <SwitchRow icon={Landmark} tone="emerald" label={t("treasury.active")} checked={active} onChange={setActive} /> : null}
    </ActionDialog>
  );
}
