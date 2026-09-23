import { setRequestLocale } from "next-intl/server";
import { InboxView } from "@/views/inbox-view";

type Props = { params: Promise<{ locale: string }> };

export default async function InboxPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InboxView />;
}
