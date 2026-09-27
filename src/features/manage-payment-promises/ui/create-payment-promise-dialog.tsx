"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { PaymentPromise, PaymentRepository } from "@/entities/payment";
import { useCan } from "@/entities/viewer";
import { parseMoneyInput } from "@/shared/lib/money";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  bookingId: string;
  currency: string;
  repository: PaymentRepository;
  onCreated: (promise: PaymentPromise) => void;
};

const localDay = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function CreatePaymentPromiseDialog({ bookingId, currency, repository, onCreated }: Props) {
  const t = useTranslations("finance.promises");
  const allowed = useCan("payments.write");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [promisedOn, setPromisedOn] = useState(() => localDay(7));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const minor = parseMoneyInput(amount);
  const ready = !busy && minor !== null && minor > 0 && Boolean(promisedOn);

  function change(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setAmount("");
      setNote("");
      setPromisedOn(localDay(7));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || minor === null) return;
    setBusy(true);
    try {
      const created = await repository.createPromise(bookingId, {
        amount: minor,
        currency,
        promisedOn,
        note,
      });
      feedback.success(t("created"));
      setBusy(false);
      change(false);
      onCreated(created);
    } catch (err) {
      setBusy(false);
      feedback.error(err, t("createError"));
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => change(true)} data-testid="promise-add">
        <Plus className="h-3.5 w-3.5" />
        {t("add")}
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-md" data-testid="promise-dialog">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="promise-amount">{t("amountIn", { currency })}</Label>
                <Input
                  id="promise-amount"
                  dir="ltr"
                  inputMode="decimal"
                  value={amount}
                  disabled={busy}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={amount !== "" && minor === null}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promise-date">{t("promisedOn")}</Label>
                <Input
                  id="promise-date"
                  type="date"
                  value={promisedOn}
                  min={localDay()}
                  disabled={busy}
                  onChange={(e) => setPromisedOn(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promise-note">{t("note")}</Label>
              <Textarea
                id="promise-note"
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!ready}>
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
