"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Columns3, ListChecks, Rows3 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { SegmentedControl, TONES } from "@/shared/ui";

export type TaskViewMode = "kanban" | "table";

type Props = {
  managerMode?: boolean;
  view: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
  /** Primary actions on the end side, e.g. "New task". */
  actions?: ReactNode;
};

/** Tasks title block: icon, title, subtitle, view switch and primary actions. */
export function TasksHeader({ managerMode, view, onViewChange, actions }: Props) {
  const t = useTranslations("tasks");
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-testid="tasks-header">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.violet.gradient)}
          aria-hidden
        >
          <ListChecks className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-950 sm:text-[34px] sm:leading-[40px]">
            {managerMode ? t("teamTitle") : t("title")}
          </h1>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">
            {managerMode ? t("teamSubtitle") : t("subtitle")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SegmentedControl
          aria-label={t("viewMode")}
          size="lg"
          value={view}
          onChange={onViewChange}
          className="rounded-[18px] bg-white/80"
          options={[
            { value: "kanban", label: t("kanban"), icon: Columns3 },
            { value: "table", label: t("table"), icon: Rows3 },
          ]}
        />
        {actions}
      </div>
    </header>
  );
}
