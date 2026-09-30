"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Columns3, Rows3, Workflow } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { SegmentedControl, TONES } from "@/shared/ui";

export type ViewMode = "kanban" | "table";

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Primary actions on the end side, e.g. "New lead". */
  actions?: ReactNode;
};

/** Pipeline title block: icon, title, subtitle, view switch and primary actions. */
export function PipelineHeader({ view, onViewChange, actions }: Props) {
  const t = useTranslations("pipeline");
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-testid="pipeline-header">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.indigo.gradient)}
          aria-hidden
        >
          <Workflow className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-950 sm:text-[34px] sm:leading-[40px]">
            {t("title")}
          </h1>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">{t("subtitle")}</p>
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
