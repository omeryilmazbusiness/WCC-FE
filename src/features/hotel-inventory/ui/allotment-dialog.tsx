"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BedDouble, CalendarClock, CalendarRange, NotebookPen, Warehouse } from "lucide-react";
import {
  ALLOTMENT_KIND_LOOK,
  ROOM_LOOK,
  ROOM_TYPES,
  addDays,
  daysBetween,
  type Allotment,
  type AllotmentInput,
  type AllotmentKind,
  type Hotel,
  type HotelRepository,
  type RoomType,
} from "@/entities/hotel";
import { formatDay } from "@/shared/lib/format";
import { ActionDialog, Button, ChoiceGrid, Field, FormSection, Input, Stepper, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  allotment?: Allotment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (allotment: Allotment) => void;
};

const MAX_RELEASE_DAYS = 90;
const MAX_SPAN_DAYS = 731;

function initial(hotel: Hotel, a?: Allotment | null): AllotmentInput {
  return {
    roomType: a?.roomType ?? (hotel.roomTypes[0] as RoomType),
    kind: a?.kind ?? "guaranteed",
    startDate: a?.startDate ?? "",
    endDate: a?.endDate ?? "",
    rooms: a?.rooms ?? 10,
    releaseDays: a?.releaseDays ?? 7,
    notes: a?.notes ?? "",
  };
}

type AllotmentError = "dates" | "span" | "rooms" | "belowSold";

function allotmentError(d: AllotmentInput, sold: number): AllotmentError | null {
  if (!d.startDate || !d.endDate || d.endDate < d.startDate) return "dates";
  if (daysBetween(d.startDate, d.endDate) + 1 > MAX_SPAN_DAYS) return "span";
  if (d.rooms < 1) return "rooms";
  if (d.rooms < sold) return "belowSold";
  return null;
}

/** Room block: guaranteed (with release days) or on request, for a date range. */
export function AllotmentDialog({ repository, hotel, allotment, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<AllotmentInput>(() => initial(hotel, allotment));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(initial(hotel, allotment));
    setTouched(false);
  }, [open, hotel, allotment]);

  const sold = allotment?.sold ?? 0;
  const error = allotmentError(draft, sold);
  const set = <K extends keyof AllotmentInput>(k: K, v: AllotmentInput[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const releaseOn = draft.kind === "guaranteed" && draft.startDate ? addDays(draft.startDate, -draft.releaseDays) : null;

  async function submit() {
    setTouched(true);
    if (error) return;
    setSaving(true);
    try {
      const saved = await repository.saveAllotment(hotel.id, allotment?.id ?? null, draft);
      feedback.success(allotment ? t("allotment.updated") : t("allotment.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("allotment.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Warehouse}
      tone="emerald"
      size="lg"
      title={allotment ? t("allotment.editTitle") : t("allotment.createTitle")}
      description={t("allotment.subtitle")}
      testId="allotment-dialog"
      footer={
        <>
          {touched && error ? (
            <p className="me-auto self-center text-[12.5px] font-semibold text-rose-600" role="alert">
              {t(`allotment.errors.${error}`, { sold })}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || (touched && Boolean(error))} onClick={() => void submit()} data-testid="allotment-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={BedDouble} tone="indigo" title={t("allotment.room")}>
          <ChoiceGrid
            name="allotment-room"
            columns={3}
            value={draft.roomType}
            onChange={(v) => set("roomType", v)}
            options={ROOM_TYPES.filter((r) => hotel.roomTypes.includes(r)).map((r) => ({ value: r, label: t(`room.${r}`), ...ROOM_LOOK[r] }))}
          />
        </FormSection>

        <FormSection icon={Warehouse} tone="emerald" title={t("allotment.kind")} hint={t(`allotment.kindHint.${draft.kind}`)}>
          <ChoiceGrid<AllotmentKind>
            name="allotment-kind"
            value={draft.kind}
            onChange={(v) => set("kind", v)}
            options={(["guaranteed", "on_request"] as const).map((k) => ({ value: k, label: t(`allotmentKind.${k}`), hint: t(`allotment.kindShort.${k}`), ...ALLOTMENT_KIND_LOOK[k] }))}
          />
        </FormSection>

        <FormSection icon={CalendarRange} tone="sky" title={t("allotment.period")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("season.start")} htmlFor="allotment-start">
              <Input id="allotment-start" type="date" className="h-12" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} data-testid="allotment-start" />
            </Field>
            <Field label={t("season.end")} htmlFor="allotment-end">
              <Input id="allotment-end" type="date" className="h-12" min={draft.startDate || undefined} value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} data-testid="allotment-end" />
            </Field>
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-zinc-600">{t("allotment.rooms")}</p>
              <Stepper value={draft.rooms} min={Math.max(1, sold)} max={10000} onChange={(v) => set("rooms", v)} suffix={t("allotment.roomsUnit")} label={t("allotment.rooms")} testId="allotment-rooms" />
            </div>
          </div>
          {sold > 0 ? <p className="text-[12px] font-medium text-zinc-500">{t("allotment.soldNote", { sold })}</p> : null}
        </FormSection>

        {draft.kind === "guaranteed" ? (
          <FormSection icon={CalendarClock} tone="violet" title={t("allotment.release")} hint={t("allotment.releaseHint")}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-64">
                <Stepper
                  value={draft.releaseDays}
                  min={0}
                  max={MAX_RELEASE_DAYS}
                  onChange={(v) => set("releaseDays", v)}
                  suffix={t("policy.cancel.daysBefore")}
                  label={t("allotment.release")}
                  testId="allotment-release"
                />
              </div>
              {releaseOn ? (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[12.5px] font-semibold text-violet-700">
                  {t("allotment.releaseOn", { date: formatDay(releaseOn, locale) })}
                </span>
              ) : null}
            </div>
          </FormSection>
        ) : null}

        <FormSection icon={NotebookPen} tone="zinc" title={t("form.notes.title")}>
          <Textarea value={draft.notes} rows={2} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
        </FormSection>
      </div>
    </ActionDialog>
  );
}
