"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BusFront, Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  GlyphTile,
  IconInput,
  Input,
  MoneyInput,
  SegmentedControl,
  Stepper,
  Textarea,
} from "@/shared/ui";
import { BUS_CLASSES, busRideIssues, emptyBusRide, type BusRide } from "../model/bus-ride";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  adults?: number;
  initial?: BusRide | null;
  onSaved: (ride: BusRide) => void;
};

/** Manual coach entry for a booking — company, route, vehicle and money. */
export function BusRideDialog({ open, onOpenChange, currency, adults = 1, initial, onSaved }: Props) {
  const t = useTranslations("bookings.form");
  const [ride, setRide] = useState<BusRide>(() => initial ?? emptyBusRide(adults));
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRide(initial ?? emptyBusRide(adults));
    setAttempted(false);
  }, [open, initial, adults]);

  const issues = attempted ? busRideIssues(ride) : [];

  function patch(next: Partial<BusRide>) {
    setRide((cur) => ({ ...cur, ...next }));
  }

  function save() {
    const found = busRideIssues(ride);
    if (found.length) {
      setAttempted(true);
      return;
    }
    onSaved(ride);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex max-h-[92vh] w-[min(96vw,720px)] max-w-none flex-col gap-0 overflow-hidden bg-[#f4f6fa] p-0 sm:p-0"
        data-testid="create-booking-bus-dialog"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3.5 pe-10">
            <GlyphTile icon={BusFront} tone="amber" size="section" />
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight tracking-tight">{initial ? t("editBus") : t("addBus")}</DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug">{t("busHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          <Field label={t("busCompany")}>
            <IconInput
              icon={BusFront}
              value={ride.company}
              onChange={(e) => patch({ company: e.target.value })}
              placeholder={t("busCompanyPh")}
              data-testid="create-booking-bus-company"
            />
            {issues.includes("company") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busCompanyRequired")}</p> : null}
          </Field>
          <Field label={t("busCompanyPhone")}>
            <Input className="h-12" value={ride.companyPhone} onChange={(e) => patch({ companyPhone: e.target.value })} />
          </Field>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busOrigin")}>
              <Input className="h-12" value={ride.origin} onChange={(e) => patch({ origin: e.target.value })} data-testid="create-booking-bus-origin" />
              {issues.includes("origin") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busRouteRequired")}</p> : null}
            </Field>
            <Field label={t("busDestination")}>
              <Input className="h-12" value={ride.destination} onChange={(e) => patch({ destination: e.target.value })} data-testid="create-booking-bus-destination" />
              {issues.includes("destination") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busRouteRequired")}</p> : null}
            </Field>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busPickup")}>
              <Input className="h-12" value={ride.pickup} onChange={(e) => patch({ pickup: e.target.value })} />
            </Field>
            <Field label={t("busDropoff")}>
              <Input className="h-12" value={ride.dropoff} onChange={(e) => patch({ dropoff: e.target.value })} />
            </Field>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busDepartDate")}>
              <Input className="h-12" type="date" value={ride.departDate} onChange={(e) => patch({ departDate: e.target.value })} data-testid="create-booking-bus-depart" />
              {issues.includes("departDate") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busDepartRequired")}</p> : null}
            </Field>
            <Field label={t("busDepartTime")}>
              <Input className="h-12" type="time" value={ride.departTime} onChange={(e) => patch({ departTime: e.target.value })} />
            </Field>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busArriveDate")}>
              <Input className="h-12" type="date" value={ride.arriveDate} onChange={(e) => patch({ arriveDate: e.target.value })} />
              {issues.includes("arriveDate") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busArriveInvalid")}</p> : null}
            </Field>
            <Field label={t("busArriveTime")}>
              <Input className="h-12" type="time" value={ride.arriveTime} onChange={(e) => patch({ arriveTime: e.target.value })} />
            </Field>
          </div>

          <Field label={t("busClass")}>
            <SegmentedControl
              className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
              value={ride.vehicleClass || "standard"}
              onChange={(vehicleClass) => patch({ vehicleClass })}
              options={BUS_CLASSES.map((c) => ({
                value: c,
                label: c === "standard" ? t("busClassStandard") : c === "vip" ? t("busClassVip") : t("busClassSleeper"),
              }))}
            />
          </Field>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busPlate")}>
              <Input className="h-12" value={ride.plateNo} onChange={(e) => patch({ plateNo: e.target.value.toUpperCase() })} />
            </Field>
            <Field label={t("busSeats")}>
              <Stepper value={ride.seats} onChange={(seats) => patch({ seats })} min={1} max={80} label={t("busSeats")} />
            </Field>
          </div>
          <Field label={t("busSeatNumbers")}>
            <Input className="h-12" value={ride.seatNumbers} onChange={(e) => patch({ seatNumbers: e.target.value })} placeholder="12A, 12B" />
          </Field>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("busDriver")}>
              <Input className="h-12" value={ride.driverName} onChange={(e) => patch({ driverName: e.target.value })} />
            </Field>
            <Field label={t("busDriverPhone")}>
              <Input className="h-12" value={ride.driverPhone} onChange={(e) => patch({ driverPhone: e.target.value })} />
            </Field>
          </div>
          <Field label={t("busConfirmation")}>
            <Input className="h-12" value={ride.confirmation} onChange={(e) => patch({ confirmation: e.target.value.toUpperCase() })} />
            {issues.includes("confirmation") ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">{t("busConfirmationInvalid")}</p> : null}
          </Field>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field label={t("unitPrice")}>
              <MoneyInput currency={currency} value={ride.unitPrice} onChange={(unitPrice) => patch({ unitPrice })} />
            </Field>
            <Field label={t("unitCost")}>
              <MoneyInput currency={currency} value={ride.unitCost} onChange={(unitCost) => patch({ unitCost })} />
            </Field>
          </div>
          <Field label={t("busNotes")}>
            <Textarea rows={3} value={ride.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-200/60 bg-white/80 px-5 py-3.5 sm:px-7">
          <Button type="button" variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
            {t("back")}
          </Button>
          <Button type="button" className="h-11 gap-1.5" data-testid="create-booking-bus-save" onClick={save}>
            <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />
            {t("busSave")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
