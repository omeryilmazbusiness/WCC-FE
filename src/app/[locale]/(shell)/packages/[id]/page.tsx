import { setRequestLocale } from "next-intl/server";
import { PackageDetailView } from "@/views/package-detail-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PackageDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <PackageDetailView packageId={id} />;
}
