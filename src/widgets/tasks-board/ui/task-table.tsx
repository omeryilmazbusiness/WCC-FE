"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  TASK_KIND_LOOK,
  TASK_PRIORITY_LOOK,
  hasRelatedRecord,
  isTaskOverdue,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { hrefForRelated } from "@/shared/lib/related-href";
import { PackageLinkChip } from "@/features/package-link";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { DataTable, IconTile, StageBadge, TASK_STATUS_TONES, TONES } from "@/shared/ui";
import { useRelatedText } from "../model/use-related-text";
import { TaskActions } from "./task-actions";

const DUE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

type Props = {
  tasks: Task[];
  locale: string;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  onOpen?: (task: Task) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
};

export function TaskTable({
  tasks,
  locale,
  repository,
  onChanged,
  onOpen,
  selectable,
  selectedIds = [],
  onSelectionChange,
}: Props) {
  const t = useTranslations("tasks");
  const relatedText = useRelatedText();

  const columns = useMemo<ColumnDef<Task>[]>(() => {
    const cols: ColumnDef<Task>[] = [];
    if (selectable) {
      cols.push({
        id: "select",
        header: "",
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={selectedIds.includes(row.original.id)}
            onChange={(e) => {
              if (!onSelectionChange) return;
              if (e.target.checked) {
                onSelectionChange([...selectedIds, row.original.id]);
              } else {
                onSelectionChange(selectedIds.filter((id) => id !== row.original.id));
              }
            }}
            aria-label={t("selectTask")}
          />
        ),
      });
    }
    cols.push(
      {
        accessorKey: "title",
        header: t("fields.title"),
        cell: ({ row }) => {
          const task = row.original;
          const look = TASK_KIND_LOOK[task.kind] ?? TASK_KIND_LOOK.custom;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <IconTile icon={look.icon} tone={look.tone} size="lg" />
              <div className="min-w-0">
                {onOpen ? (
                  <button
                    type="button"
                    dir="auto"
                    onClick={() => onOpen(task)}
                    className="block max-w-full truncate text-start font-semibold text-zinc-950 hover:underline focus-visible:underline focus-visible:outline-none"
                    data-testid="task-row-open"
                  >
                    {task.title}
                  </button>
                ) : (
                  <p dir="auto" className="truncate font-semibold text-zinc-950">
                    {task.title}
                  </p>
                )}
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {hasRelatedRecord(task) ? (
                    <Link href={hrefForRelated(task)} className="text-xs font-medium text-sky-700 hover:underline">
                      {relatedText(task)}
                    </Link>
                  ) : (
                    <p className="text-xs text-zinc-400">{t(`kinds.${task.kind}`)}</p>
                  )}
                  {task.pkg ? (
                    <PackageLinkChip
                      packageId={task.pkg.packageId}
                      code={task.pkg.packageCode}
                      departureCode={task.pkg.departureCode}
                      compact
                      className="py-0.5"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: t("fields.priority"),
        cell: ({ row }) => {
          const look = TASK_PRIORITY_LOOK[row.original.priority];
          const Icon = look.icon;
          return (
            <span
              className={cn("inline-flex h-7 items-center gap-1.5 rounded-full ps-1.5 pe-2.5 text-[12px] font-semibold", TONES[look.tone].soft)}
              data-testid="task-row-priority"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.3} aria-hidden />
              {t(`priorities.${row.original.priority}`)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            <StageBadge tone={TASK_STATUS_TONES[row.original.status]} label={t(`statuses.${row.original.status}`)} />
            {isTaskOverdue(row.original) ? <StageBadge tone="rose" label={t("overdue")} /> : null}
            {row.original.escalatedAt ? <StageBadge tone="violet" label={t("escalated")} /> : null}
          </div>
        ),
      },
      {
        accessorKey: "assigneeName",
        header: t("fields.assignee"),
      },
      {
        accessorKey: "dueAt",
        header: t("fields.dueAt"),
        cell: ({ row }) => (
          <span className={cn("whitespace-nowrap tabular-nums", isTaskOverdue(row.original) ? "font-semibold text-rose-600" : "text-zinc-600")}>
            {row.original.dueAt ? formatDate(row.original.dueAt, locale, DUE_FORMAT) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("fields.actions"),
        cell: ({ row }) => <TaskActions task={row.original} repository={repository} onChanged={onChanged} />,
      },
    );
    return cols;
  }, [t, relatedText, locale, repository, onChanged, onOpen, selectable, selectedIds, onSelectionChange]);

  return <DataTable columns={columns} data={tasks} emptyMessage={t("empty")} />;
}
