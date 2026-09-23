import { setRequestLocale } from "next-intl/server";
import { ImportExportView } from "@/views/import-export-view";

type Props = { params: Promise<{ locale: string }> };

export default async function ImportExportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ImportExportView />;
}
