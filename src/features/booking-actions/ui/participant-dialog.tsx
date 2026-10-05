"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserRoundPlus } from "lucide-react";
import { GENDERS, type BookingParticipant, type BookingRepository, type Gender, type ParticipantInput } from "@/entities/booking";
import { Button, Input, SegmentedControl, useMutationFeedback, ActionDialog, Field } from "@/shared/ui";

type Props = {
  bookingId: string;
  repository: BookingRepository;
  /** Editing when set; adding otherwise. */
  participant: BookingParticipant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

type Form = Required<Omit<ParticipantInput, "dateOfBirth">> & { dateOfBirth: string };

function formOf(p: BookingParticipant | null): Form {
  return {
    fullName: p?.fullName ?? "",
    passportNo: p?.passportNo ?? "",
    nationality: p?.nationality ?? "",
    dateOfBirth: p?.dateOfBirth ?? "",
    gender: p?.gender ?? "",
    nationalId: p?.nationalId ?? "",
    healthOk: p?.healthOk ?? false,
  };
}

const NATIONAL_ID = /^[A-Za-z0-9]{5,20}$/;

export function ParticipantDialog({ bookingId, repository, participant, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("bookingWorkspace.pax");
  const tc = useTranslations("common");
  const te = useTranslations("bookingWorkspace.errors");
  const feedback = useMutationFeedback();
  const [form, setForm] = useState<Form>(() => formOf(participant));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(formOf(participant));
  }, [open, participant]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const nidChanged = form.nationalId.trim() !== "" && form.nationalId !== participant?.nationalId;
  const nidValid = !nidChanged || NATIONAL_ID.test(form.nationalId.trim());
  const valid = form.fullName.trim().length > 0 && nidValid;

  async function save() {
    setSaving(true);
    const input: ParticipantInput = {
      fullName: form.fullName.trim(),
      passportNo: form.passportNo.trim(),
      nationality: form.nationality.trim().toUpperCase(),
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      nationalId: form.nationalId.trim(),
      healthOk: form.healthOk,
    };
    try {
      if (participant) await repository.updateParticipant(bookingId, participant.id, input);
      else await repository.addParticipant(bookingId, input);
      feedback.success(t("saved"));
      onSaved();
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, te("save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={UserRoundPlus}
      tone="sky"
      title={participant ? t("edit") : t("add")}
      testId="booking-participant-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void save()} data-testid="participant-save">
            {t("save")}
          </Button>
        </>
      }
    >
      <Field label={t("fullName")} htmlFor="pp-name">
        <Input id="pp-name" value={form.fullName} maxLength={200} onChange={(e) => set("fullName", e.target.value)} autoFocus />
      </Field>
      <Field label={t("gender")}>
        <SegmentedControl<Gender | "">
          value={form.gender}
          onChange={(v) => set("gender", v)}
          aria-label={t("gender")}
          options={[{ value: "", label: t("unspecified") }, ...GENDERS.map((g) => ({ value: g, label: t(g) }))]}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("passport")} htmlFor="pp-passport">
          <Input id="pp-passport" dir="ltr" value={form.passportNo} maxLength={20} onChange={(e) => set("passportNo", e.target.value.toUpperCase())} />
        </Field>
        <Field label={t("nationalId")} htmlFor="pp-nid">
          <Input
            id="pp-nid"
            dir="ltr"
            inputMode="numeric"
            value={form.nationalId}
            maxLength={20}
            aria-invalid={!nidValid}
            onChange={(e) => set("nationalId", e.target.value)}
          />
        </Field>
        <Field label={t("dob")} htmlFor="pp-dob">
          <Input id="pp-dob" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label={t("nationality")} htmlFor="pp-nat">
          <Input id="pp-nat" dir="ltr" value={form.nationality} maxLength={2} placeholder="TR" onChange={(e) => set("nationality", e.target.value)} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-emerald-50/60 p-3 text-[13.5px] font-semibold text-zinc-800">
        <input
          type="checkbox"
          className="h-5 w-5 rounded-md accent-emerald-600"
          checked={form.healthOk}
          onChange={(e) => set("healthOk", e.target.checked)}
          data-testid="participant-health"
        />
        {t("health")}
      </label>
    </ActionDialog>
  );
}
