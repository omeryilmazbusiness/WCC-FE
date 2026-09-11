import { setRequestLocale } from "next-intl/server";
import { PipelineView } from "@/views/pipeline-view";

type Props = { params: Promise<{ locale: string }> };

export default async function PipelinePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PipelineView />;
}
