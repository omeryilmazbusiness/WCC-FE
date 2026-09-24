import { setRequestLocale } from "next-intl/server";
import { SuppliersView } from "@/views/suppliers-view";

type Props = { params: Promise<{ locale: string }> };

export default async function SuppliersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SuppliersView />;
}
