"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { DataTable, EmptyState } from "@/shared/ui";

type Props = {
  leads: Lead[];
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
};

export function PipelineTable({ leads, repository, onChanged }: Props) {
  const t = useTranslations("pipeline");

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "fullName",
      header: t("fields.name"),
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-950">{row.original.fullName}</span>
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
        <AssignLeadDialog
          lead={row.original}
          repository={repository}
          onAssigned={onChanged}
        />
      ),
    },
  ];

  if (leads.length === 0) {
    return <EmptyState title={t("empty")} description={t("emptyHint")} />;
  }

  return <DataTable columns={columns} data={leads} emptyMessage={t("empty")} />;
}
