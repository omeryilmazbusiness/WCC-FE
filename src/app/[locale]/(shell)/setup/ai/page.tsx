import { setRequestLocale } from "next-intl/server";
import { AISetupView } from "@/views/ai-setup-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AISetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AISetupView />;
}
