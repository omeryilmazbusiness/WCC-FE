import { setRequestLocale } from "next-intl/server";
import { TargetsView } from "@/views/targets-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TargetsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TargetsView />;
}
