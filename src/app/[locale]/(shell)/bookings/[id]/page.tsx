import { setRequestLocale } from "next-intl/server";
import { BookingDetailView } from "@/views/booking-detail-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BookingDetailView bookingId={id} />;
}
