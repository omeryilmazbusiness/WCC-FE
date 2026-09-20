"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  isTaskOverdue,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { hrefForRelated } from "@/shared/lib/related-href";
import { Link } from "@/shared/i18n/navigation";
import { DataTable, StageBadge, TASK_STATUS_TONES } from "@/shared/ui";
import { TaskActions } from "./task-actions";

type Props = {
  tasks: Task[];
  repository: TaskRepository;
  onChanged: (task: Task) => void;
};

export function TaskTable({ tasks, repository, onChanged }: Props) {
  const t = useTranslations("tasks");

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("fields.title"),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-zinc-950">{row.original.title}</p>
            <Link
              href={hrefForRelated({
                relatedType: row.original.relatedType,
                relatedId: row.original.relatedId,
                customerId: row.original.customerId,
              })}
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              {row.original.relatedLabel}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            <StageBadge
              tone={TASK_STATUS_TONES[row.original.status]}
              label={t(`statuses.${row.original.status}`)}
            />
            {isTaskOverdue(row.original) ? (
              <StageBadge tone="amber" label={t("overdue")} />
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "kind",
        header: t("fields.kind"),
        cell: ({ row }) => t(`kinds.${row.original.kind}`),
      },
      {
        accessorKey: "assigneeName",
        header: t("fields.assignee"),
      },
      {
        accessorKey: "dueAt",
        header: t("fields.dueAt"),
        cell: ({ row }) =>
          row.original.dueAt
            ? new Date(row.original.dueAt).toLocaleString()
            : "—",
      },
      {
        id: "actions",
        header: t("fields.actions"),
        cell: ({ row }) => (
          <TaskActions
            task={row.original}
            repository={repository}
            onChanged={onChanged}
          />
        ),
      },
    ],
    [t, repository, onChanged],
  );

  return (
    <DataTable
      columns={columns}
      data={tasks}
      emptyMessage={t("empty")}
    />
  );
}
