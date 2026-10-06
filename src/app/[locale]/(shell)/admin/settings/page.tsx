import { setRequestLocale } from "next-intl/server";
import { SettingsHomeView } from "@/views/settings-view";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsHomeView />;
}
