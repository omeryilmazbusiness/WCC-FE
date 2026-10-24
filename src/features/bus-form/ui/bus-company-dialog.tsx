"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BusFront, Globe, IdCard, Mail, MapPin, Phone, Power, UserRound } from "lucide-react";
import { CLASS_LOOK, VEHICLE_CLASSES, type BusCompany, type BusRepository } from "@/entities/bus";
import { isApiError } from "@/shared/api/api-error";
import {
  ActionDialog,
  Button,
  ChoiceGrid,
  Field,
  FormSection,
  IconInput,
  Input,
  SwitchRow,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import { SERVER_FIELD, draftErrors, draftFromCompany, draftToInput, newDraft, type BusDraft, type BusDraftField } from "../model/draft";

type Props = {
  repository: BusRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: BusCompany | null;
  onSaved: (company: BusCompany) => void;
};

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-[12px] font-medium text-rose-600">{children}</p>;
}

export function BusCompanyDialog({ repository, open, onOpenChange, company, onSaved }: Props) {
  const t = useTranslations("buses");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<BusDraft>(newDraft);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<BusDraftField, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(company ? draftFromCompany(company) : newDraft());
    setTouched(false);
    setServerErrors({});
  }, [open, company]);

  const errors = useMemo(() => draftErrors(draft), [draft]);
  const invalid = Object.keys(errors).length > 0;
  const set = <K extends keyof BusDraft>(key: K, value: BusDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((s) => {
      const next = { ...s };
      delete next[key as BusDraftField];
      return next;
    });
  };
  const err = (f: BusDraftField) =>
    serverErrors[f] ?? (touched && errors[f] ? t(`form.errors.${errors[f]}`) : undefined);

  async function submit() {
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    try {
      const input = draftToInput(draft);
      const saved = company ? await repository.update(company.id, input) : await repository.create(input);
      feedback.success(company ? t("form.updated") : t("form.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      if (isApiError(e) && e.fieldErrors) {
        const mapped: Partial<Record<BusDraftField, string>> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) if (SERVER_FIELD[k]) mapped[SERVER_FIELD[k]] = v;
        setServerErrors(mapped);
      }
      feedback.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={BusFront}
      tone="amber"
      size="xl"
      title={company ? t("form.editTitle") : t("form.createTitle")}
      description={t("form.subtitle")}
      testId="bus-company-dialog"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving} data-testid="bus-save">
            {saving ? t("saving") : company ? t("form.save") : t("form.create")}
          </Button>
        </>
      }
    >
      <FormSection icon={BusFront} tone="amber" title={t("form.identity")}>
        <Field label={t("fields.name")} htmlFor="bus-name">
          <Input id="bus-name" value={draft.name} onChange={(e) => set("name", e.target.value)} autoComplete="organization" />
          <FieldError>{err("name")}</FieldError>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("fields.phone")} htmlFor="bus-phone">
            <IconInput icon={Phone} id="bus-phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
            <FieldError>{err("phone")}</FieldError>
          </Field>
          <Field label={t("fields.email")} htmlFor="bus-email">
            <IconInput icon={Mail} id="bus-email" value={draft.email} onChange={(e) => set("email", e.target.value)} inputMode="email" />
            <FieldError>{err("email")}</FieldError>
          </Field>
        </div>
        <Field label={t("fields.website")} htmlFor="bus-web">
          <IconInput icon={Globe} id="bus-web" value={draft.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection icon={MapPin} tone="sky" title={t("form.location")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("fields.country")} htmlFor="bus-country">
            <Input id="bus-country" value={draft.country} onChange={(e) => set("country", e.target.value)} maxLength={80} />
            <FieldError>{err("country")}</FieldError>
          </Field>
          <Field label={t("fields.city")} htmlFor="bus-city">
            <Input id="bus-city" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
        </div>
        <Field label={t("fields.address")} htmlFor="bus-address">
          <Input id="bus-address" value={draft.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection icon={CLASS_LOOK[draft.vehicleClass].icon} tone={CLASS_LOOK[draft.vehicleClass].tone} title={t("fields.class")}>
        <ChoiceGrid
          name="bus-class"
          value={draft.vehicleClass}
          onChange={(v) => set("vehicleClass", v)}
          options={VEHICLE_CLASSES.map((k) => ({
            value: k,
            label: t(`classes.${k}`),
            icon: CLASS_LOOK[k].icon,
            tone: CLASS_LOOK[k].tone,
          }))}
        />
        <FieldError>{err("vehicleClass")}</FieldError>
        <Field label={t("fields.licenseNo")} htmlFor="bus-license">
          <IconInput icon={IdCard} id="bus-license" value={draft.licenseNo} onChange={(e) => set("licenseNo", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection icon={UserRound} tone="indigo" title={t("form.contact")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("fields.contactName")} htmlFor="bus-contact">
            <Input id="bus-contact" value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Field>
          <Field label={t("fields.contactPhone")} htmlFor="bus-cphone">
            <IconInput icon={Phone} id="bus-cphone" value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="tel" />
            <FieldError>{err("contactPhone")}</FieldError>
          </Field>
        </div>
        <Field label={t("fields.notes")} htmlFor="bus-notes">
          <Textarea id="bus-notes" value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </Field>
        <SwitchRow icon={Power} tone={draft.isActive ? "emerald" : "zinc"} label={t("fields.active")} checked={draft.isActive} onChange={(v) => set("isActive", v)} />
      </FormSection>
    </ActionDialog>
  );
}
