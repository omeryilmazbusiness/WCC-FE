import { setRequestLocale } from "next-intl/server";
import { RoomingView } from "@/views/rooming-view";

type Props = { params: Promise<{ locale: string }> };

export default async function RoomingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoomingView />;
}
