"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCopy, Hash, MailCheck, Send, UserRound } from "lucide-react";
import { mailtoUrl, type Hotel, type Quote } from "@/entities/hotel";
import { formatDay } from "@/shared/lib/format";
import { Button, Field, FormSection, IconInput, Textarea, useToast } from "@/shared/ui";

type Props = { hotel: Hotel; quote: Quote };

/**
 * Hotel voucher / booking request for the quoted stay, addressed to the contract's
 * reservations e-mail. Net amounts never leave the agency.
 */
export function VoucherPanel({ hotel, quote }: Props) {
  const t = useTranslations("hotels.voucher");
  const th = useTranslations("hotels");
  const locale = useLocale();
  const { push } = useToast();
  const [guest, setGuest] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const to = hotel.contact.reservationsEmail;

  const { subject, body } = useMemo(() => {
    const stay = `${formatDay(quote.checkIn, locale)} → ${formatDay(quote.checkOut, locale)}`;
    const lines = [
      t("greeting", { hotel: hotel.name }),
      "",
      t("intro"),
      "",
      `${t("lines.reference")}: ${reference.trim() || "—"}`,
      `${t("lines.guest")}: ${guest.trim() || "—"}`,
      `${t("lines.stay")}: ${stay} (${th("season.nights", { n: quote.nights })})`,
      `${t("lines.rooms")}: ${quote.rooms} × ${th(`room.${quote.roomType}`)}`,
      `${t("lines.board")}: ${th(`meal.${quote.mealPlan}.label`)}`,
      `${t("lines.occupancy")}: ${th("quote.guestsLine", { adults: quote.adults, children: quote.children.length })}`,
      ...(quote.children.length ? [`${t("lines.childAges")}: ${quote.children.map((c) => c.age).join(", ")}`] : []),
      ...(notes.trim() ? ["", `${t("lines.notes")}: ${notes.trim()}`] : []),
      "",
      t("closing"),
    ];
    return {
      subject: t("subject", { hotel: hotel.name, stay, ref: reference.trim() || guest.trim() || "" }).trim(),
      body: lines.join("\n"),
    };
  }, [hotel.name, quote, guest, reference, notes, locale, t, th]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      push({ title: t("copied"), tone: "success" });
    } catch {
      push({ title: th("quote.copyFailed"), tone: "error" });
    }
  }

  return (
    <FormSection icon={MailCheck} tone="violet" title={t("title")} hint={to ? t("hint", { email: to }) : t("noEmail")} testId="hotel-voucher">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("guest")} htmlFor="voucher-guest">
          <IconInput id="voucher-guest" icon={UserRound} value={guest} maxLength={120} onChange={(e) => setGuest(e.target.value)} />
        </Field>
        <Field label={t("reference")} htmlFor="voucher-ref">
          <IconInput id="voucher-ref" icon={Hash} dir="ltr" value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </div>
      <Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} aria-label={t("lines.notes")} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void copy()}>
          <ClipboardCopy className="h-4 w-4" aria-hidden />
          {t("copy")}
        </Button>
        {to ? (
          <Button asChild data-testid="voucher-send">
            <a href={mailtoUrl(to, subject, body)}>
              <Send className="h-4 w-4" aria-hidden />
              {t("send")}
            </a>
          </Button>
        ) : (
          <Button disabled data-testid="voucher-send">
            <Send className="h-4 w-4" aria-hidden />
            {t("send")}
          </Button>
        )}
      </div>
    </FormSection>
  );
}
