import { setRequestLocale } from "next-intl/server";
import { FlightsView } from "@/views/flights-view";

type Props = { params: Promise<{ locale: string }> };

export default async function FlightsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FlightsView />;
}
