import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isSettingsDetail } from "@/shared/config/settings";
import { SettingsSectionView } from "@/views/settings-view";

type Props = { params: Promise<{ locale: string; section: string }> };

export default async function SettingsSectionPage({ params }: Props) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  if (!isSettingsDetail(section)) notFound();
  return <SettingsSectionView section={section} />;
}
