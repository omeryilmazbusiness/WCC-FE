import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MemoryCustomerRepository } from "@/entities/customer";
import { MemoryLeadRepository } from "@/entities/lead";
import type { Booking } from "@/entities/booking";
import { Customer360View } from "@/widgets/customer-360";

type Props = { params: Promise<{ locale: string; id: string }> };

/** Bookings still F6 stub — single source until bookings domain lands */
const demoBookings: Booking[] = [
  {
    id: "bk-demo",
    status: "draft",
    paxCount: 2,
    totalAmount: 12000,
    balanceAmt: 12000,
    currency: "USD",
  },
];

export default async function CustomerDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const customers = new MemoryCustomerRepository();
  const leads = new MemoryLeadRepository();

  let customer;
  try {
    customer = await customers.getById(id);
  } catch {
    notFound();
  }

  const customerLeads = await leads.listByCustomerId(customer.id);

  return (
    <Customer360View
      customer={customer}
      leads={customerLeads}
      bookings={demoBookings}
    />
  );
}
