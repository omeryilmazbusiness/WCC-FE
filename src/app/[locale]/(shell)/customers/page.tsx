import { setRequestLocale } from "next-intl/server";
import { CustomersListView } from "@/views/customers-list-view";

type Props = { params: Promise<{ locale: string }> };

export default async function CustomersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CustomersListView />;
}
