"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Stamp } from "lucide-react";
import { VISA_LOOK, lookOf, type TourPackage } from "@/entities/tourpackage";
import { NO_PACKAGE, PackagePicker, packageName, pickOf, usePackageCatalog, type PackagePick } from "@/features/package-link";
import { formatMoney } from "@/shared/lib/format";
import { Button, Field, TONES } from "@/shared/ui";
import { applyVisaPick, visaOffersOf, visaPickFromOffer, visaSummary } from "../model/visa-pick";
import type { BookingDraft } from "../model/draft";

type Props = {
  draft: BookingDraft;
  serviceKey: string;
  onPatch: (next: Partial<BookingDraft>) => void;
};

/**
 * Services-step visa row: the catalogue is restricted to visa packages.
 * Choosing a type writes sell/net onto that line via applyVisaPick.
 */
export function VisaServiceField({ draft, serviceKey, onPatch }: Props) {
  const t = useTranslations("bookings.form");
  const tp = useTranslations("packages");
  const locale = useLocale();
  const { byId } = usePackageCatalog();
  const bound = draft.visa;
  const [pending, setPending] = useState<PackagePick>(NO_PACKAGE);
  const pick: PackagePick = bound ? pickOf(bound.packageId, bound.departureId) : pending;
  const pkg = pick.packageId ? byId.get(pick.packageId) ?? null : null;
  const offers = pkg ? visaOffersOf(pkg) : [];

  function applyFrom(nextPkg: TourPackage, type: string, departureId: string | null) {
    const label = `${tp(`visa.${type}`)} · ${packageName(nextPkg, locale)}`;
    const visa = visaPickFromOffer(nextPkg, type, departureId, label);
    if (!visa) return;
    onPatch(applyVisaPick(draft, visa, { serviceKey }));
  }

  function onPackage(next: PackagePick) {
    const nextPkg = next.packageId ? byId.get(next.packageId) ?? null : null;
    if (!nextPkg) {
      setPending(NO_PACKAGE);
      const boundToVisaSheet = Boolean(draft.visa && draft.packageId === draft.visa.packageId);
      onPatch(boundToVisaSheet || draft.serviceType === "visa" ? { visa: null, packageId: "", departureId: "" } : { visa: null });
      return;
    }
    setPending(next);
    const types = visaOffersOf(nextPkg);
    if (types.length === 1) applyFrom(nextPkg, types[0].type, next.departureId);
  }

  return (
    <Field label={t("pickVisa")} hint={t("pickVisaHint")}>
      <PackagePicker
        value={pick}
        onChange={onPackage}
        requireDeparture
        required
        kind="visa"
        customerId={draft.customerId || null}
        defaultOpen={!pick.packageId}
        testId={`create-booking-visa-pkg-${serviceKey}`}
      />
      {pkg && offers.length > 0 ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {offers.map((offer) => {
            const look = lookOf(VISA_LOOK, offer.type);
            const Icon = look.icon;
            const active = bound?.packageId === pkg.id && bound.type === offer.type;
            return (
              <li key={offer.type}>
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="h-auto w-full justify-start gap-3 rounded-[20px] px-3.5 py-3"
                  data-testid={`create-booking-visa-offer-${offer.type}`}
                  onClick={() => applyFrom(pkg, offer.type, pick.departureId)}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${TONES[look.tone].soft}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate text-[14px] font-semibold">{tp(`visa.${offer.type}`)}</span>
                    <span className="block text-[12px] font-medium text-zinc-500">
                      {formatMoney(offer.sell, locale, pkg.baseCurrency)}
                      {offer.processingDays ? ` · ${offer.processingDays}d` : ""}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {bound ? (
        <p className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-zinc-500" data-testid="create-booking-visa-picked">
          <Stamp className="h-3.5 w-3.5 text-rose-500" aria-hidden />
          {visaSummary(bound)}
        </p>
      ) : null}
    </Field>
  );
}
