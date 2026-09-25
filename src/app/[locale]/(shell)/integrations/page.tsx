import { setRequestLocale } from "next-intl/server";
import { IntegrationsView } from "@/views/integrations-view";

type Props = { params: Promise<{ locale: string }> };

export default async function IntegrationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <IntegrationsView />;
}
