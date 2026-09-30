"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Check,
  Clock3,
  Minus,
  PencilLine,
  Phone,
  SearchX,
  Trash2,
  UserRoundPlus,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import {
  LEAD_SOURCE_LOOK,
  leadSourceKind,
  stageLook,
  type Lead,
  type LeadRepository,
} from "@/entities/lead";
import { AssignLeadDialog } from "@/features/assign-lead";
import { BulkAssignLeadsDialog } from "@/features/bulk-assign-leads";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole, formatRelativeTime } from "@/shared/lib/format";
import { DataTable, EmptyState, IconTile, Pager, TONES, type DataTableColumnMeta } from "@/shared/ui";

type Props = {
  leads: Lead[];
  locale: string;
  repository: LeadRepository;
  canWrite: boolean;
  canDelete: boolean;
  onChanged: (lead: Lead) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteSelected: (ids: string[]) => void;
  /** Server paging: `leads` is page `page` (0-based) of `total` matches. */
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
};

/** List view of the pipeline: one row per lead with trip, budget, source and owner at a glance. */
export function PipelineTable({
  leads,
  locale,
  repository,
  canWrite,
  canDelete,
  onChanged,
  selectedIds,
  onSelectionChange,
  onOpenLead,
  onEditLead,
  onDeleteSelected,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
}: Props) {
  const t = useTranslations("pipeline");
  const canSelect = canWrite || canDelete;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, page * pageSize + leads.length);
  const visibleSelected = selectedIds.filter((id) => leads.some((l) => l.id === id));
  const allSelected = leads.length > 0 && visibleSelected.length === leads.length;
  const someSelected = visibleSelected.length > 0 && !allSelected;

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      ...(canSelect
        ? [
            {
              id: "select",
              header: () => (
                <SelectBox
                  state={allSelected ? "on" : someSelected ? "mixed" : "off"}
                  label={t("list.selectAll")}
                  onToggle={() => onSelectionChange(allSelected ? [] : leads.map((l) => l.id))}
                  testId="pipeline-select-all"
                />
              ),
              cell: ({ row }) => {
                const id = row.original.id;
                const on = selectedIds.includes(id);
                return (
                  <SelectBox
                    state={on ? "on" : "off"}
                    label={t("list.selectRow", { name: row.original.fullName })}
                    onToggle={() => onSelectionChange(on ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])}
                    testId="pipeline-select-row"
                  />
                );
              },
            } satisfies ColumnDef<Lead>,
          ]
        : []),
      {
        id: "lead",
        header: t("list.lead"),
        cell: ({ row }) => {
          const lead = row.original;
          const sourceKind = leadSourceKind(lead.source);
          const source = LEAD_SOURCE_LOOK[sourceKind];
          const SourceIcon = source.icon;
          const sourceLabel = sourceKind === "other" ? lead.source : t(`card.sources.${sourceKind}`);
          return (
            <button
              type="button"
              onClick={() => onOpenLead(lead)}
              className="group flex items-center gap-3 rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10"
              data-testid="pipeline-row-open"
            >
              <span className="relative shrink-0">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-[12.5px] font-bold",
                    TONES[stageLook(lead.stage).tone].gradient,
                  )}
                  aria-hidden
                >
                  {initials(lead.fullName)}
                </span>
                {sourceLabel ? (
                  <span
                    className={cn(
                      "absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white 2xl:hidden",
                      TONES[source.tone].soft,
                    )}
                    title={`${t("list.source")}: ${sourceLabel}`}
                    data-testid="pipeline-row-source-badge"
                  >
                    <SourceIcon className="h-3 w-3" strokeWidth={2.4} aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span dir="auto" className="block max-w-[11rem] truncate text-start text-[14px] font-semibold text-zinc-950 group-hover:underline group-hover:underline-offset-4">
                  {lead.fullName}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-zinc-500">
                  <Phone className="h-3 w-3 text-zinc-400" aria-hidden />
                  <span dir="ltr" className="tabular-nums">
                    {lead.phone}
                  </span>
                </span>
              </span>
            </button>
          );
        },
      },
      {
        id: "stage",
        header: t("list.stage"),
        cell: ({ row }) => <LeadStageMenu lead={row.original} repository={repository} onChanged={onChanged} />,
      },
      {
        id: "trip",
        header: t("list.trip"),
        cell: ({ row }) => {
          const { interest } = row.original;
          const travel = interest.travelDate ? formatDay(interest.travelDate, locale) : interest.travelWindow;
          if (!travel && !interest.paxCount) return <Muted>{t("list.noTrip")}</Muted>;
          return (
            <Fact
              icon={<IconTile icon={CalendarDays} tone="sky" />}
              value={travel || "—"}
              sub={
                interest.paxCount ? (
                  <span className="inline-flex items-center gap-1">
                    <UsersRound className="h-3 w-3 text-violet-500" aria-hidden />
                    {t("card.pax", { count: interest.paxCount })}
                  </span>
                ) : null
              }
            />
          );
        },
      },
      {
        id: "budget",
        header: t("list.budget"),
        cell: ({ row }) => {
          const { interest } = row.original;
          const budget =
            interest.budgetAmount != null && interest.budgetCurrency
              ? formatMoneyWhole(interest.budgetAmount, locale, interest.budgetCurrency)
              : "";
          if (!budget && !interest.packageInterest) return <Muted>—</Muted>;
          return (
            <Fact
              icon={<IconTile icon={Wallet} tone="emerald" />}
              value={budget || "—"}
              sub={interest.packageInterest || null}
            />
          );
        },
      },
      {
        id: "source",
        meta: { className: "hidden 2xl:table-cell" } satisfies DataTableColumnMeta,
        header: t("list.source"),
        cell: ({ row }) => {
          const kind = leadSourceKind(row.original.source);
          const look = LEAD_SOURCE_LOOK[kind];
          const label = kind === "other" ? row.original.source : t(`card.sources.${kind}`);
          if (!label) return <Muted>—</Muted>;
          return <Fact icon={<IconTile icon={look.icon} tone={look.tone} />} value={label} />;
        },
      },
      {
        id: "owner",
        header: t("list.owner"),
        cell: ({ row }) => (
          <Fact
            icon={
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[10.5px] font-bold text-zinc-600" aria-hidden>
                {initials(row.original.ownerName || "?")}
              </span>
            }
            value={row.original.ownerName || "—"}
            sub={
              <span className="inline-flex items-center gap-1" title={t("list.updated")}>
                <Clock3 className="h-3 w-3 text-zinc-400" aria-hidden />
                {formatRelativeTime(row.original.updatedAt, locale)}
              </span>
            }
          />
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: () => <span className="sr-only">{t("list.actions")}</span>,
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1.5">
                  <AssignLeadDialog
                    lead={row.original}
                    repository={repository}
                    onAssigned={onChanged}
                    trigger={
                      <button
                        type="button"
                        aria-label={t("assign")}
                        title={t("assign")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 ring-1 ring-inset ring-zinc-100 transition hover:bg-zinc-100 hover:text-zinc-900"
                        data-testid="pipeline-row-assign"
                      >
                        <UserRoundPlus className="h-4 w-4" aria-hidden />
                      </button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => onEditLead(row.original)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 px-2.5 text-[12px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(15,23,42,0.7)] transition hover:bg-zinc-800"
                    data-testid="pipeline-row-edit"
                  >
                    <PencilLine className="h-4 w-4" aria-hidden />
                    {t("edit")}
                  </button>
                </div>
              ),
            } satisfies ColumnDef<Lead>,
          ]
        : []),
    ],
    [t, locale, canWrite, canSelect, leads, selectedIds, allSelected, someSelected, onSelectionChange, onOpenLead, onEditLead, repository, onChanged],
  );

  if (leads.length === 0 && !loading) {
    return <EmptyState icon={SearchX} title={t("empty")} description={t("emptyHint")} />;
  }

  return (
    <div className="space-y-3" data-testid="pipeline-table" aria-busy={loading}>
      {canSelect && visibleSelected.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-[20px] border border-sky-200/70 bg-sky-50/70 px-3 py-2"
          data-testid="pipeline-selection-bar"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white shadow-[0_6px_14px_-8px_rgba(14,165,233,0.8)]" aria-hidden>
            <Check className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <p className="text-[13px] font-semibold text-sky-900">{t("list.selected", { count: visibleSelected.length })}</p>
          <div className="ms-auto flex items-center gap-2">
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDeleteSelected(visibleSelected)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-[12px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/80 transition hover:bg-rose-100"
                data-testid="pipeline-bulk-delete"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("delete.selected")}
              </button>
            ) : null}
            {canWrite ? (
            <BulkAssignLeadsDialog
              selectedIds={visibleSelected}
              repository={repository}
              onAssigned={(updated) => {
                for (const l of updated) onChanged(l);
                onSelectionChange([]);
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 px-3 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                  data-testid="pipeline-bulk-assign"
                >
                  <UserRoundPlus className="h-4 w-4" aria-hidden />
                  {t("list.assignSelected")}
                </button>
              }
            />
            ) : null}
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[12px] font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("list.clear")}
            </button>
          </div>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={leads}
        emptyMessage={t("empty")}
        className={cn(
          "transition-opacity [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_td:first-child]:ps-5 [&_th:first-child]:ps-5 [&_td:last-child]:pe-5 [&_th:last-child]:pe-5",
          loading && "opacity-60",
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 px-1" data-testid="pipeline-table-footer">
        <p className="text-[12.5px] font-medium text-zinc-500 tabular-nums" data-testid="pipeline-table-range">
          {t("list.range", { first: first.toLocaleString(locale), last: last.toLocaleString(locale), total: total.toLocaleString(locale) })}
        </p>
        <Pager page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

function Fact({ icon, value, sub }: { icon: React.ReactNode; value: string; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <p dir="auto" className="max-w-[9rem] truncate text-start text-[13px] font-semibold text-zinc-900">
          {value}
        </p>
        {sub ? <div className="max-w-[9rem] truncate text-[11.5px] font-medium text-zinc-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] font-medium text-zinc-300">{children}</span>;
}

function SelectBox({
  state,
  label,
  onToggle,
  testId,
}: {
  state: "on" | "off" | "mixed";
  label: string;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : state === "on"}
      aria-label={label}
      onClick={onToggle}
      data-testid={testId}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        state === "off" ? "border-zinc-300 bg-white hover:border-zinc-400" : "border-sky-500 bg-sky-500 text-white",
      )}
    >
      {state === "on" ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      {state === "mixed" ? <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}
