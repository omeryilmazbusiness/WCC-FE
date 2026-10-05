import { setRequestLocale } from "next-intl/server";
import { SupplierDetailView } from "@/views/supplier-detail-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function SupplierDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <SupplierDetailView supplierId={id} />;
}
