import { setRequestLocale } from "next-intl/server";
import { AdminSettingsView } from "@/views/admin-settings-view";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSettingsView />;
}
