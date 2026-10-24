import type { BookingDraft } from "./draft";

export type CustomerSeed = {
  id: string;
  fullName: string;
  nationality?: string;
  dateOfBirth?: string | null;
};

/** Seeds the paying customer and the first unnamed traveller. Presentation-free. */
export function applyCustomer(draft: BookingDraft, customer: CustomerSeed): Partial<BookingDraft> {
  const travellers = draft.travellers.map((p, i) => {
    if (i !== 0 || p.fullName.trim()) return p;
    return {
      ...p,
      fullName: customer.fullName,
      nationality: p.nationality || (customer.nationality ?? "").toUpperCase(),
      dateOfBirth: p.dateOfBirth || customer.dateOfBirth || "",
    };
  });
  return { customerId: customer.id, customerLabel: customer.fullName, travellers };
}
