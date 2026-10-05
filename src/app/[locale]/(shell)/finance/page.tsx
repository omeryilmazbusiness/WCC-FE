import { setRequestLocale } from "next-intl/server";
import { FinanceHubView } from "@/views/finance-hub-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FinancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FinanceHubView />;
}
