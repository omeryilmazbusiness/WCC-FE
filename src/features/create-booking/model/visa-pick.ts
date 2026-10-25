import { findVisaOffer, type VisaOffer } from "@/entities/tourpackage/spec";
import { minorToInput } from "@/shared/lib/money";
import { emptyService, type BookingDraft, type VisaPick } from "./draft";

export type { VisaPick };

type VisaSheet = {
  id: string;
  kind: string;
  baseCurrency: string;
  spec: { visaOffers: VisaOffer[] };
};

export function visaOffersOf(pkg: Pick<VisaSheet, "kind" | "spec">): VisaOffer[] {
  return pkg.kind === "visa" ? pkg.spec.visaOffers.filter((o) => o.type) : [];
}

export function visaPickFromOffer(pkg: VisaSheet, type: string, departureId: string | null, label: string): VisaPick | null {
  const offer = findVisaOffer(pkg.spec.visaOffers, type);
  if (!offer || !offer.type) return null;
  return {
    packageId: pkg.id,
    departureId,
    type: offer.type,
    label,
    sellMinor: offer.sell,
    netMinor: offer.net,
    currency: pkg.baseCurrency,
    processingDays: offer.processingDays,
  };
}

export function visaSummary(pick: VisaPick): string {
  return pick.label.slice(0, 160);
}

export type ApplyVisaOpts = {
  /** When set, prices land on this service row instead of the first visa line. */
  serviceKey?: string;
};

/** Writes the chosen visa type onto the matching service line, and the trip header when the booking is a visa sheet. */
export function applyVisaPick(draft: BookingDraft, pick: VisaPick, opts: ApplyVisaOpts = {}): Partial<BookingDraft> {
  const label = visaSummary(pick);
  const qty = Math.max(1, draft.travellers.filter((p) => p.fullName.trim()).length);
  const priced = {
    kind: "visa" as const,
    label,
    quantity: qty,
    unitPrice: pick.sellMinor ? minorToInput(pick.sellMinor) : "0",
    unitCost: pick.netMinor ? minorToInput(pick.netMinor) : "0",
  };
  const i = opts.serviceKey
    ? draft.services.findIndex((s) => s.key === opts.serviceKey)
    : draft.services.findIndex((s) => s.kind === "visa");
  const onlyBlank = draft.services.length === 1 && !draft.services[0].label.trim();
  const services =
    i >= 0
      ? draft.services.map((s, n) => (n === i ? { ...s, ...priced } : s))
      : onlyBlank
        ? [{ ...draft.services[0], ...priced }]
        : [...draft.services, { ...emptyService("visa"), ...priced }];
  const bindSheet = draft.serviceType === "visa" || !draft.packageId;
  return {
    visa: pick,
    services,
    ...(bindSheet
      ? {
          serviceType: draft.serviceType === "package" || draft.serviceType === "visa" ? ("visa" as const) : draft.serviceType,
          packageId: pick.packageId,
          departureId: pick.departureId ?? "",
          summary: draft.summary.trim() || label,
          currency: pick.currency || draft.currency,
          supplierSource: draft.supplierSource || "nusuk",
        }
      : {}),
  };
}
