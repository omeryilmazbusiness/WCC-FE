"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, CalendarClock, Coins, Hash, Mail, Phone, ShieldAlert, User } from "lucide-react";
import type { Agency, AgencyInput, FinanceRepository } from "@/entities/finance";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, Field, IconInput, MoneyInput, Stepper, SwitchRow, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  agency: Agency | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (a: Agency) => void;
};

const blank: AgencyInput = {
  code: "",
  name: "",
  contactName: "",
  phone: "",
  email: "",
  taxId: "",
  currency: "SAR",
  creditLimit: 0,
  paymentTermsDays: 15,
  graceDays: 0,
  autoSuspend: true,
};

const CODE = /^[A-Z0-9_-]{2,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** B2B agency profile with its credit limit, payment terms and the automatic sales stop. */
export function AgencyDialog({ repository, agency, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [form, setForm] = useState<AgencyInput>(blank);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = agency ? { ...blank, ...agency } : blank;
    setForm({
      code: base.code,
      name: base.name,
      contactName: base.contactName,
      phone: base.phone,
      email: base.email,
      taxId: base.taxId,
      currency: base.currency,
      creditLimit: base.creditLimit,
      paymentTermsDays: base.paymentTermsDays,
      graceDays: base.graceDays,
      autoSuspend: base.autoSuspend,
    });
    setLimit(agency ? minorToInput(agency.creditLimit) : "");
  }, [open, agency]);

  const set = <K extends keyof AgencyInput>(k: K, v: AgencyInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const limitMinor = limit.trim() ? parseMoneyInput(limit) : 0;
  const valid =
    CODE.test(form.code) && form.name.trim().length > 0 && /^[A-Z]{3}$/.test(form.currency) && limitMinor !== null && (!form.email || EMAIL.test(form.email));

  async function submit() {
    if (!valid || saving || limitMinor === null) return;
    setSaving(true);
    try {
      const input = { ...form, name: form.name.trim(), creditLimit: limitMinor, email: form.email.trim(), phone: form.phone.trim() };
      const saved = agency ? await repository.updateAgency(agency.id, input) : await repository.createAgency(input);
      feedback.success(t("receivables.agencySaved"));
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
      icon={Building2}
      tone="indigo"
      size="lg"
      title={agency ? t("receivables.editAgency") : t("receivables.newAgency")}
      description={t("receivables.agencyHint")}
      testId="finance-agency-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-agency-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field label={t("receivables.code")} htmlFor="ag-code">
          <IconInput id="ag-code" icon={Hash} dir="ltr" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20))} autoFocus data-testid="ag-code" />
        </Field>
        <Field label={t("receivables.agencyName")} htmlFor="ag-name">
          <IconInput id="ag-name" icon={Building2} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} data-testid="ag-name" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("receivables.contact")} htmlFor="ag-contact">
          <IconInput id="ag-contact" icon={User} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} maxLength={120} />
        </Field>
        <Field label={t("receivables.phone")} htmlFor="ag-phone">
          <IconInput id="ag-phone" icon={Phone} dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
        </Field>
        <Field label={t("receivables.email")} htmlFor="ag-email">
          <IconInput id="ag-email" icon={Mail} dir="ltr" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={160} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr]">
        <Field label={t("receivables.taxId")} htmlFor="ag-tax">
          <IconInput id="ag-tax" icon={Hash} dir="ltr" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} maxLength={40} />
        </Field>
        <Field label={t("currency")} htmlFor="ag-cur">
          <IconInput id="ag-cur" icon={Coins} dir="ltr" value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} />
        </Field>
        <Field label={t("receivables.creditLimit")} htmlFor="ag-limit" hint={t("receivables.creditLimitHint")}>
          <MoneyInput id="ag-limit" currency={form.currency || "—"} value={limit} onChange={setLimit} data-testid="ag-limit" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("receivables.terms")}>
          <Stepper label={t("receivables.terms")} value={form.paymentTermsDays} onChange={(v) => set("paymentTermsDays", v)} min={0} max={180} suffix={t("days")} />
        </Field>
        <Field label={t("receivables.grace")} hint={t("receivables.graceHint")}>
          <Stepper label={t("receivables.grace")} value={form.graceDays} onChange={(v) => set("graceDays", v)} min={0} max={90} suffix={t("days")} />
        </Field>
      </div>
      <SwitchRow
        icon={ShieldAlert}
        tone="rose"
        label={t("receivables.autoSuspend")}
        hint={t("receivables.autoSuspendHint")}
        checked={form.autoSuspend}
        onChange={(v) => set("autoSuspend", v)}
        testId="ag-auto"
      />
      <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        {t("receivables.sweepNote")}
      </p>
    </ActionDialog>
  );
}
