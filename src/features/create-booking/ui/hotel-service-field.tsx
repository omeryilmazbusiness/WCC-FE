"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { Button, Field } from "@/shared/ui";
import type { BookingDraft } from "../model/draft";
import { HotelPickedCard, PickHotelDialog } from "./pick-hotel-dialog";

type Props = {
  draft: BookingDraft;
  serviceKey: string;
  onPatch: (next: Partial<BookingDraft>) => void;
};

/** Services-step hotel row: catalogue room types at satış prices. */
export function HotelServiceField({ draft, serviceKey, onPatch }: Props) {
  const t = useTranslations("bookings.form");
  const [open, setOpen] = useState(false);
  return (
    <Field label={t("pickHotel")} hint={t("pickHotelHint")}>
      {draft.hotel ? <HotelPickedCard draft={draft} onChange={() => setOpen(true)} /> : (
        <Button type="button" className="h-12 w-full gap-2 rounded-[18px]" data-testid="create-booking-pick-hotel-service" onClick={() => setOpen(true)}>
          <Building2 className="h-5 w-5" aria-hidden />
          {t("pickHotel")}
        </Button>
      )}
      <PickHotelDialog open={open} onOpenChange={setOpen} draft={draft} serviceKey={serviceKey} onPicked={onPatch} />
    </Field>
  );
}
