import { setRequestLocale } from "next-intl/server";
import { HotelDetailView } from "@/views/hotel-detail-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function HotelDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HotelDetailView hotelId={id} />;
}
