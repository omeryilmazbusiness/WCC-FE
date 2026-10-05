"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link2, MessageCircle, MessageSquareText, ShieldCheck } from "lucide-react";
import { clampPaymentAmount, createBookingWorkspaceRepository, dialablePhone, whatsappUrl } from "@/entities/booking";
import { refCode, type Debtor } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, CopyButton, Field, MoneyInput, useMutationFeedback } from "@/shared/ui";

type Props = {
  debtor: Debtor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Creates a 3D Secure card payment link for a balance and shares it over WhatsApp or SMS. */
export function PaymentLinkDialog({ debtor, open, onOpenChange }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const repo = useMemo(() => createBookingWorkspaceRepository(), []);
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(minorToInput(debtor.balance));
    setUrl("");
  }, [open, debtor.balance]);

  const minor = parseMoneyInput(amount);
  const charge = minor ? clampPaymentAmount(minor, debtor.balance) : 0;
  const phone = dialablePhone(debtor.phone);
  const message = url ? t("receivables.linkMessage", { name: debtor.customerName, ref: refCode(debtor.refNo), amount: formatMoney(charge, locale, debtor.currency), url }) : "";

  async function create() {
    if (!charge || busy) return;
    setBusy(true);
    try {
      const link = await repo.createPaymentLink(debtor.bookingId, charge);
      setUrl(link.url);
      feedback.success(t("receivables.linkReady"));
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ShieldCheck}
      tone="emerald"
      title={t("receivables.linkTitle", { ref: refCode(debtor.refNo) })}
      description={t("receivables.linkHint")}
      testId="finance-link-dialog"
      footer={
        url ? (
          <>
            <Button asChild variant="secondary" aria-disabled={!phone}>
              <a href={phone ? `sms:+${phone}?&body=${encodeURIComponent(message)}` : undefined}>
                <MessageSquareText className="h-4 w-4" aria-hidden />
                SMS
              </a>
            </Button>
            <Button asChild aria-disabled={!phone}>
              <a href={phone ? whatsappUrl(debtor.phone, message) : undefined} target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp">
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={!charge || busy} onClick={() => void create()} data-testid="finance-link-create">
              <Link2 className="h-4 w-4" aria-hidden />
              {busy ? t("saving") : t("receivables.createLink")}
            </Button>
          </>
        )
      }
    >
      <Field label={t("amount")} htmlFor="pl-amount" hint={t("receivables.linkMax", { amount: formatMoney(debtor.balance, locale, debtor.currency) })}>
        <MoneyInput id="pl-amount" currency={debtor.currency} value={amount} onChange={(v) => { setAmount(v); setUrl(""); }} />
      </Field>
      {url ? (
        <div className="flex items-center gap-2 rounded-[18px] bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-100" data-testid="link-url">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-emerald-800" dir="ltr">
            {url}
          </span>
          <CopyButton value={url} label={t("copyLink")} />
        </div>
      ) : null}
      {!phone ? <p className="text-[12px] font-medium text-amber-700">{t("receivables.noPhone")}</p> : null}
    </ActionDialog>
  );
}
