"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PencilLine } from "lucide-react";
import {
  SALES_CHANNELS,
  SERVICE_TYPES,
  SUPPLIER_SOURCES,
  type Booking,
  type BookingProfile,
  type BookingWorkspaceRepository,
} from "@/entities/booking";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useMutationFeedback, ActionDialog, Field } from "@/shared/ui";

const NO_SUPPLIER = "__none";

type Props = {
  booking: Booking;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (booking: Booking) => void;
};

function profileOf(b: Booking): BookingProfile {
  return {
    pnr: b.pnr,
    serviceType: b.serviceType,
    supplierSource: b.supplierSource,
    channel: b.channel,
    summary: b.summary,
    companyName: b.companyName,
  };
}

export function EditBookingProfileDialog({ booking, workspace, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [form, setForm] = useState<BookingProfile>(() => profileOf(booking));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(profileOf(booking));
  }, [open, booking]);

  const set = <K extends keyof BookingProfile>(key: K, value: BookingProfile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const pnrValid = /^[A-Za-z0-9][A-Za-z0-9-]{0,31}$/.test(form.pnr.trim()) || form.pnr.trim() === "";

  async function save() {
    setSaving(true);
    try {
      const updated = await workspace.updateProfile(booking.id, form);
      feedback.success(t("profile.saved"));
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={PencilLine}
      tone="indigo"
      title={t("profile.title")}
      testId="booking-profile-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={saving || !pnrValid} data-testid="booking-profile-save">
            {t("profile.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("profile.pnr")} hint={t("profile.pnrHint")} htmlFor="bp-pnr">
          <Input
            id="bp-pnr"
            dir="ltr"
            value={form.pnr}
            maxLength={32}
            onChange={(e) => set("pnr", e.target.value.toUpperCase())}
            aria-invalid={!pnrValid}
            className="font-mono tracking-wider"
          />
        </Field>
        <Field label={t("profile.serviceType")}>
          <Select value={form.serviceType} onValueChange={(v) => set("serviceType", v as BookingProfile["serviceType"])}>
            <SelectTrigger aria-label={t("profile.serviceType")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`service.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("profile.supplier")}>
          <Select
            value={form.supplierSource || NO_SUPPLIER}
            onValueChange={(v) => set("supplierSource", v === NO_SUPPLIER ? "" : (v as BookingProfile["supplierSource"]))}
          >
            <SelectTrigger aria-label={t("profile.supplier")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SUPPLIER}>{t("supplier.none")}</SelectItem>
              {SUPPLIER_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`supplier.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("profile.channel")}>
          <Select value={form.channel} onValueChange={(v) => set("channel", v as BookingProfile["channel"])}>
            <SelectTrigger aria-label={t("profile.channel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALES_CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`channel.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={t("profile.summary")} htmlFor="bp-summary">
        <Input
          id="bp-summary"
          value={form.summary}
          maxLength={160}
          placeholder={t("profile.summaryPlaceholder")}
          onChange={(e) => set("summary", e.target.value)}
        />
      </Field>
      {form.channel === "b2b_agency" ? (
        <Field label={t("profile.company")} htmlFor="bp-company">
          <Input id="bp-company" value={form.companyName} maxLength={160} onChange={(e) => set("companyName", e.target.value)} />
        </Field>
      ) : null}
    </ActionDialog>
  );
}
