"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, FileText, Hash, Minus, Plus, Receipt } from "lucide-react";
import {
  ENTRY_LOOK,
  applyEntry,
  balance,
  entryKindsFor,
  type EntryKind,
  type LedgerEntry,
  type Supplier,
  type SupplierRepository,
} from "@/entities/supplier";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";
import { ActionDialog, Button, ChoiceGrid, Field, IconInput, MoneyInput, SegmentedControl, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: SupplierRepository;
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: (result: { entry: LedgerEntry; supplier: Supplier }) => void;
};

/** Books a top-up, charge, refund, payment or adjustment with a live balance preview. */
export function PostEntryDialog({ repository, supplier, open, onOpenChange, onPosted }: Props) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const kinds = entryKindsFor(supplier.finance.paymentModel);
  const [kind, setKind] = useState<EntryKind>(kinds[0]);
  const [sign, setSign] = useState<"plus" | "minus">("plus");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(entryKindsFor(supplier.finance.paymentModel)[0]);
    setSign("plus");
    setAmount("");
    setReference("");
    setNote("");
  }, [open, supplier.finance.paymentModel]);

  const minor = parseMoneyInput(amount);
  const signed = minor === null ? null : kind === "adjustment" && sign === "minus" ? -minor : minor;
  const preview = useMemo(() => (signed ? applyEntry(supplier.finance, kind, signed) : null), [signed, supplier.finance, kind]);
  const needsNote = kind === "adjustment" && !note.trim();
  const currency = supplier.finance.currency;
  const postpaid = supplier.finance.paymentModel === "postpaid";
  const canSubmit = Boolean(preview?.ok) && !needsNote && !saving;
  const before = balance(supplier.finance);
  const worsens = preview?.ok ? (postpaid ? preview.balanceAfter > before : preview.balanceAfter < before) : false;

  async function submit() {
    if (!canSubmit || signed === null) return;
    setSaving(true);
    try {
      const res = await repository.postLedger(supplier.id, { kind, amount: signed, reference: reference.trim(), note: note.trim() });
      feedback.success(t("ledger.posted"));
      onPosted(res);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("ledger.postError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Receipt}
      tone="emerald"
      size="lg"
      title={t("ledger.postTitle")}
      description={t("ledger.postSubtitle")}
      testId="supplier-ledger-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!canSubmit} onClick={() => void submit()} data-testid="supplier-ledger-submit">
            {saving ? t("saving") : t("ledger.post")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ChoiceGrid
          name="ledger-kind"
          columns={kinds.length > 2 ? 4 : 2}
          value={kind}
          onChange={setKind}
          options={kinds.map((k) => ({ value: k, label: t(`entry.${k}.label`), hint: t(`entry.${k}.hint`), ...ENTRY_LOOK[k] }))}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={t("ledger.amount")} htmlFor="ledger-amount">
            <MoneyInput id="ledger-amount" currency={currency} value={amount} onChange={setAmount} autoFocus data-testid="ledger-amount" />
          </Field>
          {kind === "adjustment" ? (
            <SegmentedControl
              size="lg"
              aria-label={t("ledger.direction")}
              value={sign}
              onChange={setSign}
              options={[
                { value: "plus", label: t("ledger.increase"), icon: Plus },
                { value: "minus", label: t("ledger.decrease"), icon: Minus },
              ]}
            />
          ) : null}
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-[22px] p-4 ring-1 ring-inset",
            preview && !preview.ok ? "bg-rose-50 ring-rose-100" : "bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-100",
          )}
          data-testid="ledger-preview"
        >
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{postpaid ? t("ledger.outstanding") : t("ledger.balance")}</p>
            <p className="text-[18px] font-bold tabular-nums text-zinc-900">{formatMoney(before, locale, currency)}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-zinc-400 rtl:rotate-180" aria-hidden />
          <div className="text-end">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{t("ledger.after")}</p>
            {preview?.ok ? (
              <p className={cn("text-[18px] font-bold tabular-nums", worsens ? "text-amber-700" : "text-emerald-700")}>{formatMoney(preview.balanceAfter, locale, currency)}</p>
            ) : preview ? (
              <p className="text-[13px] font-semibold text-rose-700">{t(`ledger.errors.${preview.error}`)}</p>
            ) : (
              <p className="text-[18px] font-bold text-zinc-300">—</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("ledger.reference")} htmlFor="ledger-ref" hint={t("ledger.referenceHint")}>
            <IconInput id="ledger-ref" icon={Hash} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
          </Field>
          <Field label={kind === "adjustment" ? t("ledger.noteRequired") : t("ledger.note")} htmlFor="ledger-note">
            <Textarea id="ledger-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} data-testid="ledger-note" />
          </Field>
        </div>
        {needsNote && signed ? (
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("ledger.noteNeeded")}
          </p>
        ) : null}
      </div>
    </ActionDialog>
  );
}
