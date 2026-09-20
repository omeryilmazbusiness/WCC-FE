import { setRequestLocale } from "next-intl/server";
import { Customer360View } from "@/widgets/customer-360";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <Customer360View customerId={id} />;
}
