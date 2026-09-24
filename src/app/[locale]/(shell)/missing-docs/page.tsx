import { setRequestLocale } from "next-intl/server";
import { MissingDocsView } from "@/views/missing-docs-view";

type Props = { params: Promise<{ locale: string }> };

export default async function MissingDocsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MissingDocsView />;
}
