import { setRequestLocale } from "next-intl/server";
import { HotelsView } from "@/views/hotels-view";

type Props = { params: Promise<{ locale: string }> };

export default async function HotelsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HotelsView />;
}
