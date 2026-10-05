"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Mail, MailCheck, MessageCircle, Plane } from "lucide-react";
import { mailtoUrl, whatsappUrl } from "@/entities/booking";
import type { FinanceRepository, Letter, LetterParty } from "@/entities/finance";
import { routes } from "@/shared/config/routes";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, ChoiceCard, CopyButton, Field, IconInput, SegmentedControl, useMutationFeedback } from "@/shared/ui";

export type LetterPartyOption = { type: LetterParty; id: string; name: string; email: string; phone: string };

type Props = {
  repository: FinanceRepository;
  parties: LetterPartyOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (l: Letter) => void;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Issues a balance confirmation letter and shares its one-time approval link. */
export function LetterDialog({ repository, parties, open, onOpenChange, onCreated }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [type, setType] = useState<LetterParty>("agency");
  const [partyId, setPartyId] = useState("");
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<Letter | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("agency");
    setPartyId("");
    setEmail("");
    setCreated(null);
  }, [open]);

  const options = parties.filter((p) => p.type === type);
  const party = options.find((p) => p.id === partyId) ?? null;
  const valid = party !== null && (!email || EMAIL.test(email)) && !created;
  const link = created?.token ? `${window.location.origin}/${locale}${routes.confirm(created.token)}` : "";
  const message = created ? t("recon.letterMessage", { name: created.partyName, amount: formatMoney(created.balance, locale, created.currency), date: created.periodEnd, url: link }) : "";

  async function submit() {
    if (!valid || !party || saving) return;
    setSaving(true);
    try {
      const l = await repository.createLetter({ partyType: party.type, partyId: party.id, email: email.trim() });
      setCreated(l);
      feedback.success(t("recon.letterCreated"));
      onCreated(l);
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
      icon={MailCheck}
      tone="emerald"
      size="lg"
      title={t("recon.letterTitle")}
      description={t("recon.letterHint")}
      testId="finance-letter-dialog"
      footer={
        created ? (
          <>
            {email ? (
              <Button asChild variant="secondary">
                <a href={mailtoUrl(email, t("recon.letterSubject"), message)}>
                  <Mail className="h-4 w-4" aria-hidden />
                  {t("recon.sendEmail")}
                </a>
              </Button>
            ) : null}
            {party?.phone ? (
              <Button asChild variant="secondary">
                <a href={whatsappUrl(party.phone, message)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-letter-submit">
              {saving ? t("saving") : t("recon.createLetter")}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-3" data-testid="letter-created">
          <div className="rounded-[22px] bg-gradient-to-br from-emerald-50 via-white to-white p-4 ring-1 ring-inset ring-emerald-100">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{t("recon.balanceAt", { date: created.periodEnd })}</div>
            <div className="text-[24px] font-semibold tabular-nums text-zinc-950">{formatMoney(created.balance, locale, created.currency)}</div>
            <div className="text-[13px] text-zinc-600">{created.partyName}</div>
          </div>
          <div className="flex items-center gap-2 rounded-[18px] bg-zinc-50 p-3">
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-700" dir="ltr" data-testid="letter-link">
              {link}
            </span>
            <CopyButton value={link} label={t("copyLink")} />
          </div>
          <p className="text-[12px] text-amber-700">{t("recon.linkOnce")}</p>
        </div>
      ) : (
        <>
          <SegmentedControl
            size="lg"
            aria-label={t("recon.partyType")}
            value={type}
            onChange={(v) => {
              setType(v);
              setPartyId("");
              setEmail("");
            }}
            options={[
              { value: "agency", label: t("recon.agency"), icon: Building2 },
              { value: "supplier", label: t("recon.supplier"), icon: Plane },
            ]}
          />
          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
            {options.length === 0 ? <p className="col-span-full py-4 text-center text-[12.5px] text-zinc-400">{t("recon.noParties")}</p> : null}
            {options.map((p) => (
              <ChoiceCard
                key={p.id}
                selected={partyId === p.id}
                onSelect={() => {
                  setPartyId(p.id);
                  setEmail(p.email);
                }}
                icon={type === "agency" ? Building2 : Plane}
                tone={type === "agency" ? "indigo" : "sky"}
                label={p.name}
                hint={p.email || undefined}
              />
            ))}
          </div>
          <Field label={t("receivables.email")} htmlFor="lt-mail" hint={t("recon.emailHint")}>
            <IconInput id="lt-mail" icon={Mail} dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
