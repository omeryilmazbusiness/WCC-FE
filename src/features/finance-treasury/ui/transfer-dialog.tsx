"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, CalendarDays } from "lucide-react";
import { ACCOUNT_LOOK, type Account, type FinanceRepository } from "@/entities/finance";
import { localDay } from "@/shared/lib/day";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, Field, IconInput, MoneyInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

/** Moves money between two active accounts of the same currency. */
export function TransferDialog({ repository, accounts, open, onOpenChange, onDone }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const active = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(localDay());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromId(active[0]?.id ?? "");
    setToId("");
    setAmount("");
    setFee("");
    setNote("");
    setDay(localDay());
  }, [open, active]);

  const from = active.find((a) => a.id === fromId) ?? null;
  const targets = active.filter((a) => from && a.id !== from.id && a.currency === from.currency);
  const to = targets.find((a) => a.id === toId) ?? null;
  const minor = parseMoneyInput(amount);
  const feeMinor = fee.trim() ? parseMoneyInput(fee) : 0;
  const overdraw = Boolean(from && minor && feeMinor !== null && (from.kind === "cash" || from.kind === "wallet") && from.balance - minor - feeMinor < 0);
  const valid = Boolean(from && to && minor) && feeMinor !== null && !overdraw && day <= localDay();

  async function submit() {
    if (!valid || !from || !to || !minor || feeMinor === null || saving) return;
    setSaving(true);
    try {
      await repository.transfer({ fromAccountId: from.id, toAccountId: to.id, amount: minor, fee: feeMinor, note: note.trim(), occurredOn: day });
      feedback.success(t("treasury.transferred"));
      onDone();
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const option = (a: Account) => {
    const Icon = ACCOUNT_LOOK[a.kind].icon;
    return (
      <SelectItem key={a.id} value={a.id}>
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-400" aria-hidden />
          {a.name} · {formatMoney(a.balance, locale, a.currency)}
        </span>
      </SelectItem>
    );
  };

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ArrowLeftRight}
      tone="sky"
      title={t("treasury.transferTitle")}
      description={t("treasury.transferHint")}
      testId="finance-transfer-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-transfer-submit">
            {saving ? t("saving") : t("treasury.transfer")}
          </Button>
        </>
      }
    >
      <Field label={t("treasury.from")}>
        <Select value={fromId} onValueChange={(v) => { setFromId(v); setToId(""); }}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label={t("treasury.from")}>
            <SelectValue placeholder={t("treasury.pickAccount")} />
          </SelectTrigger>
          <SelectContent>{active.map(option)}</SelectContent>
        </Select>
      </Field>
      <Field label={t("treasury.to")} hint={from && targets.length === 0 ? t("treasury.noTarget", { currency: from.currency }) : undefined}>
        <Select value={toId} onValueChange={setToId} disabled={targets.length === 0}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label={t("treasury.to")}>
            <SelectValue placeholder={t("treasury.pickAccount")} />
          </SelectTrigger>
          <SelectContent>{targets.map(option)}</SelectContent>
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("amount")} htmlFor="tr-amount">
          <MoneyInput id="tr-amount" currency={from?.currency ?? "—"} value={amount} onChange={setAmount} data-testid="tr-amount" />
        </Field>
        <Field label={t("treasury.fee")} htmlFor="tr-fee">
          <MoneyInput id="tr-fee" currency={from?.currency ?? "—"} value={fee} onChange={setFee} />
        </Field>
      </div>
      {overdraw ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.overdraw")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field label={t("treasury.date")} htmlFor="tr-day">
          <IconInput id="tr-day" icon={CalendarDays} type="date" max={localDay()} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label={t("treasury.note")} htmlFor="tr-note">
          <Textarea id="tr-note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </div>
    </ActionDialog>
  );
}
