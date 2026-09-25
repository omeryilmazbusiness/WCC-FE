import { setRequestLocale } from "next-intl/server";
import { ReportsView } from "@/views/reports-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReportsView />;
}
