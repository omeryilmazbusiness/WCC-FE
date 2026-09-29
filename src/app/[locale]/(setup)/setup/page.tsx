import { setRequestLocale } from "next-intl/server";
import { loadSetupOverview } from "@/entities/setup/server";
import { SetupView } from "@/views/setup-view";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SetupView initial={await loadSetupOverview()} />;
}
