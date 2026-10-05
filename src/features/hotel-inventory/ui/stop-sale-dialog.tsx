"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, BedDouble, CalendarRange, Layers } from "lucide-react";
import {
  ROOM_LOOK,
  ROOM_TYPES,
  daysBetween,
  type Hotel,
  type HotelRepository,
  type RoomType,
  type StopSale,
  type StopSaleInput,
} from "@/entities/hotel";
import { ActionDialog, Button, ChoiceGrid, Field, FormSection, Input, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  /** Prefills the range, e.g. from a calendar day click. */
  defaultDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (stop: StopSale) => void;
};

const MAX_SPAN_DAYS = 731;
const ALL = "all";

/** Closes sales for one room type or the whole hotel over a date range. */
export function StopSaleDialog({ repository, hotel, defaultDate, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<StopSaleInput>({ startDate: "", endDate: "", roomType: "", reason: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft({ startDate: defaultDate ?? "", endDate: defaultDate ?? "", roomType: "", reason: "" });
  }, [open, defaultDate]);

  const invalid =
    !draft.startDate || !draft.endDate || draft.endDate < draft.startDate || daysBetween(draft.startDate, draft.endDate) + 1 > MAX_SPAN_DAYS;
  const set = <K extends keyof StopSaleInput>(k: K, v: StopSaleInput[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function submit() {
    if (invalid) return;
    setSaving(true);
    try {
      const saved = await repository.createStopSale(hotel.id, draft);
      feedback.success(t("stopSale.created"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("stopSale.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const roomOptions = [
    { value: ALL, label: t("stopSale.allRooms"), icon: Layers, tone: "rose" as const },
    ...ROOM_TYPES.filter((r) => hotel.roomTypes.includes(r)).map((r) => ({ value: r, label: t(`room.${r}`), ...ROOM_LOOK[r] })),
  ];

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Ban}
      tone="rose"
      size="lg"
      title={t("stopSale.createTitle")}
      description={t("stopSale.subtitle")}
      testId="stop-sale-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" disabled={saving || invalid} onClick={() => void submit()} data-testid="stop-sale-submit">
            {saving ? t("saving") : t("stopSale.submit")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={CalendarRange} tone="sky" title={t("stopSale.period")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("season.start")} htmlFor="stop-start">
              <Input id="stop-start" type="date" className="h-12" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} data-testid="stop-start" />
            </Field>
            <Field label={t("season.end")} htmlFor="stop-end">
              <Input id="stop-end" type="date" className="h-12" min={draft.startDate || undefined} value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} data-testid="stop-end" />
            </Field>
          </div>
        </FormSection>
        <FormSection icon={BedDouble} tone="indigo" title={t("stopSale.scope")}>
          <ChoiceGrid<string>
            name="stop-room"
            columns={3}
            value={draft.roomType || ALL}
            onChange={(v) => set("roomType", v === ALL ? "" : (v as RoomType))}
            options={roomOptions}
          />
        </FormSection>
        <Field label={t("stopSale.reason")} htmlFor="stop-reason">
          <Input id="stop-reason" className="h-12" maxLength={300} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder={t("stopSale.reasonPlaceholder")} />
        </Field>
      </div>
    </ActionDialog>
  );
}
