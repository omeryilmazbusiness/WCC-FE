"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Link2, MessageCircle, ShieldCheck } from "lucide-react";
import {
  PAYMENT_GATEWAY_UNCONFIGURED,
  dialablePhone,
  whatsappUrl,
  type Booking,
  type BookingWorkspaceRepository,
  type PaymentLink,
} from "@/entities/booking";
import { isApiError } from "@/shared/api/api-error";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { Button, CopyButton, Input, useMutationFeedback, ActionDialog, Field } from "@/shared/ui";
import type { ShareContact } from "./share-dialog";

type Props = {
  booking: Booking;
  contact: ShareContact;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;
};

/** Creates a provider checkout (3D Secure) link for part or all of the balance. */
export function PaymentLinkDialog({ booking, contact, workspace, open, onOpenChange, onShared }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const money = (v: number) => formatMoney(v, locale, booking.currency);
  const parsed = amount.trim() ? parseMoneyInput(amount) : 0;
  const invalid = parsed === null || parsed < 0 || parsed > booking.balanceAmt;

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setLink(null);
    setUnconfigured(false);
  }, [open]);

  async function create() {
    if (parsed === null) return;
    setSaving(true);
    try {
      setLink(await workspace.createPaymentLink(booking.id, parsed));
      feedback.success(t("payLink.created"));
    } catch (err) {
      if (isApiError(err) && err.code === PAYMENT_GATEWAY_UNCONFIGURED) setUnconfigured(true);
      else feedback.error(err, t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsapp(l: PaymentLink) {
    const text = t("payLink.message", { name: contact.name, amount: money(l.amount), ref: l.ref, url: l.url });
    window.open(whatsappUrl(contact.phone, text), "_blank", "noopener,noreferrer");
    try {
      await workspace.recordShare(booking.id, "whatsapp", "payment_link");
      onShared?.();
    } catch (err) {
      feedback.error(err, t("errors.save"));
    }
  }

  const noBalance = booking.balanceAmt <= 0 || booking.status === "cancelled";

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={CreditCard}
      tone="violet"
      title={t("payLink.title")}
      description={t("payLink.hint")}
      testId="booking-paylink-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          {!link && !unconfigured ? (
            <Button disabled={saving || invalid || noBalance} onClick={() => void create()} data-testid="booking-paylink-create">
              <Link2 className="h-4 w-4" aria-hidden />
              {t("payLink.create")}
            </Button>
          ) : null}
        </>
      }
    >
      {unconfigured ? (
        <p className="rounded-2xl bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-900" data-testid="booking-paylink-unconfigured">
          {t("payLink.unconfigured")}
        </p>
      ) : noBalance ? (
        <p className="rounded-2xl bg-zinc-50 p-3.5 text-[13px] text-zinc-600">{t("payLink.noBalance")}</p>
      ) : link ? (
        <div className="space-y-3 rounded-[22px] bg-gradient-to-br from-violet-50 via-white to-white p-4 ring-1 ring-violet-100" data-testid="booking-paylink-result">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-violet-800">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {money(link.amount)}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-zinc-200">
            <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-700">
              {link.url}
            </span>
            <CopyButton value={link.url} label={t("payLink.copy")} />
          </div>
          {dialablePhone(contact.phone) ? (
            <Button variant="outline" className="w-full" onClick={() => void sendWhatsapp(link)}>
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
              {t("payLink.sendWhatsapp")}
            </Button>
          ) : null}
        </div>
      ) : (
        <Field label={t("payLink.amount", { currency: booking.currency })} hint={t("payLink.fullBalance", { amount: money(booking.balanceAmt) })} htmlFor="bpl-amount">
          <Input
            id="bpl-amount"
            inputMode="decimal"
            dir="ltr"
            value={amount}
            placeholder={money(booking.balanceAmt)}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={invalid}
          />
        </Field>
      )}
    </ActionDialog>
  );
}
