import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MemoryCustomerRepository } from "@/entities/customer";
import type { Booking } from "@/entities/booking";
import type { Lead } from "@/entities/lead";
import { Customer360View } from "@/widgets/customer-360";

type Props = { params: Promise<{ locale: string; id: string }> };

const demoLeads: Lead[] = [
  {
    id: "lead-1",
    fullName: "Ahmed Al-Rashid",
    phone: "+966500000001",
    stage: "qualified",
    ownerId: "sales",
  },
];

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

  const repo = new MemoryCustomerRepository();
  let customer;
  try {
    customer = await repo.getById(id);
  } catch {
    notFound();
  }

  return (
    <Customer360View
      customer={customer}
      leads={demoLeads}
      bookings={demoBookings}
    />
  );
}
