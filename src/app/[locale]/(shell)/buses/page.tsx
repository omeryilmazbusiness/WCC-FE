import { setRequestLocale } from "next-intl/server";
import { BusesView } from "@/views/buses-view";

type Props = { params: Promise<{ locale: string }> };

export default async function BusesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BusesView />;
}
