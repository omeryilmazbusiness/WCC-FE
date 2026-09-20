"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { ConvertLeadDialog } from "@/features/convert-lead";
import { DataTable, EmptyState } from "@/shared/ui";

type Props = {
  leads: Lead[];
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenLead: (lead: Lead) => void;
};

export function PipelineTable({
  leads,
  repository,
  onChanged,
  selectedIds,
  onSelectionChange,
  onOpenLead,
}: Props) {
  const t = useTranslations("pipeline");

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: "select",
        header: t("select"),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange([...selectedIds, row.original.id]);
              } else {
                onSelectionChange(selectedIds.filter((id) => id !== row.original.id));
              }
            }}
            aria-label={t("select")}
          />
        ),
      },
      {
        accessorKey: "fullName",
        header: t("fields.name"),
        cell: ({ row }) => (
          <button
            type="button"
            className="font-semibold text-zinc-950 underline-offset-4 hover:underline"
            onClick={() => onOpenLead(row.original)}
          >
            {row.original.fullName}
          </button>
        ),
      },
      { accessorKey: "phone", header: t("fields.phone") },
      { accessorKey: "source", header: t("fields.source") },
      {
        accessorKey: "ownerName",
        header: t("fields.owner"),
      },
      {
        id: "stage",
        header: t("fields.stage"),
        cell: ({ row }) => (
          <LeadStageMenu
            lead={row.original}
            repository={repository}
            onChanged={onChanged}
          />
        ),
      },
      {
        id: "actions",
        header: t("fields.actions"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <AssignLeadDialog
              lead={row.original}
              repository={repository}
              onAssigned={onChanged}
            />
            <ConvertLeadDialog
              lead={row.original}
              repository={repository}
              onConverted={(updated) => onChanged(updated)}
            />
          </div>
        ),
      },
    ],
    [t, selectedIds, onSelectionChange, onOpenLead, repository, onChanged],
  );

  if (leads.length === 0) {
    return <EmptyState title={t("empty")} description={t("emptyHint")} />;
  }

  return <DataTable columns={columns} data={leads} emptyMessage={t("empty")} />;
}
