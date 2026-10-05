"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCopy, FileText, Mail, MessageCircle, Plane, Receipt, ScrollText, Send, Share2, Ticket } from "lucide-react";
import {
  bookingSummary,
  dialablePhone,
  mailtoUrl,
  whatsappUrl,
  type Booking,
  type BookingWorkspaceRepository,
  type ShareChannel,
  type ShareDocument,
} from "@/entities/booking";
import { formatMoney } from "@/shared/lib/format";
import { Button, Textarea, useMutationFeedback, type Tone } from "@/shared/ui";
import { ActionDialog, ChoiceCard, Field } from "./action-dialog";

export type ShareContact = { name: string; phone: string; email: string };

type Doc = Extract<ShareDocument, "summary" | "voucher" | "eticket" | "proforma" | "contract">;
const DOCS: { key: Doc; icon: typeof FileText; tone: Tone }[] = [
  { key: "summary", icon: FileText, tone: "indigo" },
  { key: "voucher", icon: Ticket, tone: "emerald" },
  { key: "eticket", icon: Plane, tone: "sky" },
  { key: "proforma", icon: Receipt, tone: "amber" },
  { key: "contract", icon: ScrollText, tone: "violet" },
];

type Channel = Extract<ShareChannel, "whatsapp" | "email" | "copy">;

type Props = {
  booking: Booking;
  contact: ShareContact;
  companyName: string;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;
  defaultDocument?: Doc;
};

/** Composes a message and hands it to WhatsApp / the mail client; the share is audited. */
export function ShareBookingDialog({ booking, contact, companyName, workspace, open, onOpenChange, onShared, defaultDocument = "summary" }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const tStatus = useTranslations("bookings.status");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const hasPhone = Boolean(dialablePhone(contact.phone));
  const hasEmail = Boolean(contact.email.trim());
  const [doc, setDoc] = useState<Doc>(defaultDocument);
  const [channel, setChannel] = useState<Channel>(hasPhone ? "whatsapp" : hasEmail ? "email" : "copy");
  const [message, setMessage] = useState("");

  const template = useMemo(
    () =>
      t("share.body", {
        name: contact.name,
        ref: booking.refCode || booking.id.slice(0, 8),
        summary: bookingSummary(booking, locale) || t(`service.${booking.serviceType}`),
        status: tStatus(booking.status),
        total: formatMoney(booking.totalAmount, locale, booking.currency),
        balance: formatMoney(booking.balanceAmt, locale, booking.currency),
        company: companyName,
      }),
    [t, tStatus, booking, contact.name, companyName, locale],
  );

  useEffect(() => {
    if (!open) return;
    setDoc(defaultDocument);
    setChannel(hasPhone ? "whatsapp" : hasEmail ? "email" : "copy");
  }, [open, defaultDocument, hasPhone, hasEmail]);

  useEffect(() => {
    if (open) setMessage(doc === "summary" ? template : `${t(`share.doc.${doc}`)} — ${template}`);
  }, [open, doc, template, t]);

  async function send() {
    try {
      if (channel === "copy") {
        await navigator.clipboard.writeText(message);
        feedback.success(t("share.copied"));
      } else {
        const subject = t("share.subject", { company: companyName, ref: booking.refCode });
        if (channel === "whatsapp") window.open(whatsappUrl(contact.phone, message), "_blank", "noopener,noreferrer");
        else window.location.href = mailtoUrl(contact.email, subject, message);
      }
      await workspace.recordShare(booking.id, channel, doc);
      if (channel !== "copy") feedback.success(t("share.recorded"));
      onShared?.();
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, t("errors.save"));
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Share2}
      tone="emerald"
      title={t("share.title")}
      description={contact.name}
      testId="booking-share-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void send()} disabled={!message.trim()} data-testid="booking-share-send">
            <Send className="h-4 w-4" aria-hidden />
            {t("share.send")}
          </Button>
        </>
      }
    >
      <Field label={t("share.document")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DOCS.map((d) => (
            <ChoiceCard key={d.key} selected={doc === d.key} onSelect={() => setDoc(d.key)} icon={d.icon} tone={d.tone} label={t(`share.doc.${d.key}`)} />
          ))}
        </div>
      </Field>
      <Field label={t("share.channel")}>
        <div className="grid grid-cols-3 gap-2">
          <ChoiceCard
            selected={channel === "whatsapp"}
            onSelect={() => setChannel("whatsapp")}
            icon={MessageCircle}
            tone="emerald"
            label={t("share.whatsapp")}
            hint={hasPhone ? contact.phone : t("share.noPhone")}
            disabled={!hasPhone}
            testId="share-channel-whatsapp"
          />
          <ChoiceCard
            selected={channel === "email"}
            onSelect={() => setChannel("email")}
            icon={Mail}
            tone="sky"
            label={t("share.email")}
            hint={hasEmail ? contact.email : t("share.noEmail")}
            disabled={!hasEmail}
            testId="share-channel-email"
          />
          <ChoiceCard selected={channel === "copy"} onSelect={() => setChannel("copy")} icon={ClipboardCopy} tone="zinc" label={t("share.copy")} />
        </div>
      </Field>
      <Field label={t("share.message")} htmlFor="bs-message" hint={doc !== "summary" ? t("share.attachHint") : undefined}>
        <Textarea id="bs-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
    </ActionDialog>
  );
}
