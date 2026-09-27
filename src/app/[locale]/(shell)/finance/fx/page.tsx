import { setRequestLocale } from "next-intl/server";
import { FxRatesView } from "@/views/fx-rates-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FxRatesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FxRatesView />;
}
