"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  isReceivedAtValid,
  usePaymentErrorFeedback,
  type Payment,
  type PaymentRepository,
} from "@/entities/payment";
import { useCan } from "@/entities/viewer";
import { parseMoneyInput } from "@/shared/lib/money";
import { Button, Input, Label, useToast } from "@/shared/ui";

type Props = {
  bookingId: string;
  currency: string;
  repository: PaymentRepository;
  onRecorded: (payment: Payment) => void;
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function RecordPaymentForm({ bookingId, currency, repository, onRecorded }: Props) {
  const t = useTranslations("finance");
  const canWrite = useCan("payments.write");
  const canApprove = useCan("payments.approve");
  const feedback = usePaymentErrorFeedback();
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [autoVerify, setAutoVerify] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canWrite) return null;

  const today = localToday();
  const minor = parseMoneyInput(amount);
  const receivedOk = isReceivedAtValid(receivedAt, today);
  const ready = !busy && minor !== null && minor > 0 && receivedOk;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || minor === null) return;
    setBusy(true);
    try {
      const payment = await repository.record({
        bookingId,
        amount: minor,
        currency,
        method,
        reference: reference.trim(),
        receivedAt: receivedAt || undefined,
        autoVerify: canApprove && autoVerify,
      });
      feedback.success(t("recorded"));
      if (payment.fxMissing) {
        push({ title: t("fxMissingTitle"), description: t("fxMissingRecorded"), tone: "info" });
      }
      setAmount("");
      setReference("");
      setReceivedAt("");
      setAutoVerify(false);
      onRecorded(payment);
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-3" data-testid="record-payment-form">
      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">{t("amountIn", { currency })}</Label>
        <Input
          id="pay-amount"
          className="h-10 w-36"
          dir="ltr"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500"
          aria-invalid={amount !== "" && minor === null}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-method">{t("method")}</Label>
        <Input id="pay-method" className="h-10 w-32" value={method} onChange={(e) => setMethod(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-reference">{t("reference")}</Label>
        <Input
          id="pay-reference"
          className="h-10 w-40"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-received-at">{t("receivedAt")}</Label>
        <Input
          id="pay-received-at"
          type="date"
          className="h-10"
          value={receivedAt}
          max={today}
          onChange={(e) => setReceivedAt(e.target.value)}
          aria-invalid={!receivedOk}
          aria-describedby={!receivedOk ? "pay-received-at-error" : undefined}
          data-testid="pay-received-at"
        />
      </div>
      {canApprove ? (
        <label className="flex h-10 items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={autoVerify}
            onChange={(e) => setAutoVerify(e.target.checked)}
          />
          {t("autoVerify")}
        </label>
      ) : null}
      <Button type="submit" disabled={!ready} className="h-10">
        {t("record")}
      </Button>
      {!receivedOk ? (
        <p id="pay-received-at-error" className="basis-full text-xs text-red-600">
          {t("receivedAtFuture")}
        </p>
      ) : null}
    </form>
  );
}
