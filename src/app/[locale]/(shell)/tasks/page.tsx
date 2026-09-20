import { setRequestLocale } from "next-intl/server";
import { TasksView } from "@/views/tasks-view";

type Props = { params: Promise<{ locale: string }> };

export default async function TasksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TasksView />;
}
