import { setRequestLocale } from "next-intl/server";
import { FinanceQueuesView } from "@/views/finance-queues-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FinancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FinanceQueuesView />;
}
