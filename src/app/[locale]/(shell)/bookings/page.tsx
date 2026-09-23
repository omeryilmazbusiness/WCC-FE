import { setRequestLocale } from "next-intl/server";
import { BookingsListView } from "@/views/bookings-list-view";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ customerId?: string; departureId?: string }>;
};

export default async function BookingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  return (
    <BookingsListView customerId={sp.customerId} departureId={sp.departureId} />
  );
}
