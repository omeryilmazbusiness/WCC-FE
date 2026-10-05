import type { Booking, BookingLineItem, BookingParticipant, DocumentData } from "@/entities/booking";
import type { TourPackage } from "@/entities/tourpackage";
import type { WorkspaceContact } from "./use-booking-workspace";

export type CompanyBrand = { name: string; logoUrl: string | null };

/** Everything a printable document needs, gathered from the loaded workspace. */
export function toDocumentData(input: {
  booking: Booking;
  participants: BookingParticipant[];
  lines: BookingLineItem[];
  pkg: TourPackage | null;
  contact: WorkspaceContact;
  company: CompanyBrand;
  now?: Date;
}): DocumentData {
  const { booking: b, participants, lines, pkg, contact, company } = input;
  const spec = pkg?.spec;
  const leg = (l: { route: string; flightNo: string; date: string } | undefined) => (l && (l.route || l.flightNo) ? { ...l } : null);
  return {
    company,
    refCode: b.refCode || b.id.slice(0, 8),
    pnr: b.pnr,
    issuedAt: (input.now ?? new Date()).toISOString(),
    serviceType: b.serviceType,
    supplierSource: b.supplierSource,
    status: b.status,
    summary: b.summary,
    packageName: b.info.packageName,
    departDate: b.info.departDate,
    returnDate: b.info.returnDate,
    makkahHotel: spec?.makkah.name || b.info.makkahHotel,
    madinahHotel: spec?.madinah.name || b.info.madinahHotel,
    airline: spec?.flights.airline ?? "",
    outbound: leg(spec?.flights.outbound),
    inbound: leg(spec?.flights.inbound),
    busClass: spec?.transfers.busClass ?? "",
    guide: spec?.guidance.leaderName ?? "",
    customer: { name: contact.name || b.info.customerName, phone: contact.phone, email: contact.email },
    travellers: participants.map((p) => ({ name: p.fullName, gender: p.gender, passportLast4: p.passportLast4, dateOfBirth: p.dateOfBirth })),
    lines: lines
      .filter((l) => l.kind === "item" || l.lineTotal !== 0)
      .map((l) => ({ label: l.label, quantity: l.quantity, unitPrice: l.unitPrice, total: l.lineTotal })),
    currency: b.currency,
    totalAmount: b.totalAmount,
    discountAmt: b.discountAmt,
    collectedAmt: b.collectedAmt,
    balanceAmt: b.balanceAmt,
  };
}
