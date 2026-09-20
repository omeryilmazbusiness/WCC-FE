import { setRequestLocale } from "next-intl/server";
import { ManagerView } from "@/views/manager-view";

type Props = { params: Promise<{ locale: string }> };

export default async function ManagerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ManagerView />;
}
