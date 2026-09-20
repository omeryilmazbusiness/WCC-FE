import { setRequestLocale } from "next-intl/server";
import { WorkspaceView } from "@/views/workspace-view";

type Props = { params: Promise<{ locale: string }> };

export default async function WorkspacePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorkspaceView />;
}
