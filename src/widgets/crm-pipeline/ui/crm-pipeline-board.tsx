"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import {
  canTransitionLead,
  isLeadPeriod,
  LEAD_STAGES,
  periodRange,
  PIPELINE_COLUMNS,
  weekStartFor,
  type Lead,
  type LeadPeriod,
  type LeadQuery,
  type LeadRepository,
  type LeadSort,
  type LeadStage,
} from "@/entities/lead";
import { CreateLeadDialog, LeadFormDialog } from "@/features/create-lead";
import { LostReasonDialog } from "@/features/change-lead-stage";
import { LeadDetailDrawer } from "@/features/lead-detail";
import { createTaskRepository } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useDragScroll } from "@/shared/lib/use-drag-scroll";
import {
  ConfirmDialog,
  QueryState,
  Screen,
  SearchFilterBar,
  useMutationFeedback,
  useToast,
} from "@/shared/ui";
import { usePipelineData } from "../model/use-pipeline-data";
import { PipelineColumn, type DropState } from "./pipeline-column";
import { PipelineHeader, type ViewMode } from "./pipeline-header";
import { PipelinePeriodBar } from "./pipeline-period-bar";
import { PipelineStats } from "./pipeline-stats";
import { PipelineTable } from "./pipeline-table";

type Props = {
  repository: LeadRepository;
};

const TABLE_PAGE_SIZE = 25;
const PREFS_KEY = "wcc.pipeline.prefs";

type Prefs = { view: ViewMode; period: LeadPeriod };

function readPrefs(): Partial<Prefs> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Record<string, unknown>;
    return {
      view: raw.view === "table" || raw.view === "kanban" ? raw.view : undefined,
      period: isLeadPeriod(raw.period) ? raw.period : undefined,
    };
  } catch {
    return {};
  }
}

export function CrmPipelineBoard({ repository }: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canWrite = useCan("leads.write");
  const canDelete = useCan("leads.delete");
  const { push } = useToast();
  const feedback = useMutationFeedback();

  const [prefsReady, setPrefsReady] = useState(false);
  const [view, setView] = useState<ViewMode>("kanban");
  const [period, setPeriod] = useState<LeadPeriod>("all");
  useEffect(() => {
    const saved = readPrefs();
    if (saved.view) setView(saved.view);
    if (saved.period) setPeriod(saved.period);
    setPrefsReady(true);
  }, []);
  useEffect(() => {
    if (prefsReady) window.localStorage.setItem(PREFS_KEY, JSON.stringify({ view, period } satisfies Prefs));
  }, [prefsReady, view, period]);

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<"all" | LeadStage>("all");
  const [noFollowOnly, setNoFollowOnly] = useState(false);
  const [sort, setSort] = useState<LeadSort>("updated");
  const [tablePage, setTablePage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [pendingLost, setPendingLost] = useState<{ lead: Lead; stage: LeadStage } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const boardRef = useDragScroll<HTMLDivElement>();

  const query = useMemo<LeadQuery>(() => {
    const range = periodRange(period, new Date(), weekStartFor(locale));
    return {
      q: q || undefined,
      ownerId: ownerFilter === "all" ? undefined : ownerFilter,
      source: sourceFilter === "all" ? undefined : sourceFilter,
      noFollowUp: noFollowOnly || undefined,
      createdFrom: range.from?.toISOString(),
      createdTo: range.to?.toISOString(),
      sort,
    };
  }, [period, locale, q, ownerFilter, sourceFilter, noFollowOnly, sort]);

  const tableStage = stageFilter === "all" ? undefined : stageFilter;
  const queryKey = JSON.stringify([query, tableStage]);
  useEffect(() => {
    setTablePage(0);
    setSelected([]);
  }, [queryKey]);

  const data = usePipelineData({
    repository,
    query,
    enabled: prefsReady,
    withCards: view === "kanban",
    table: { enabled: view === "table", stage: tableStage, page: tablePage, pageSize: TABLE_PAGE_SIZE },
  });

  const analytics = useApiQuery(() => repository.analytics(), [repository]);
  const owners = analytics.data?.by_owner ?? [];
  const sources = (analytics.data?.by_source ?? []).filter((s) => s.source && s.source !== "(unknown)");

  const upsert = useCallback(
    (lead: Lead) => {
      data.applyLead(lead);
      setDetail((cur) => (cur?.id === lead.id ? lead : cur));
    },
    [data],
  );

  const total = data.columns ? data.columns.reduce((n, c) => n + c.total, 0) : null;

  function dropStateFor(stage: LeadStage): DropState {
    if (!dragging || dragging.stage === stage) return "idle";
    return canTransitionLead(dragging.stage, stage) ? "allowed" : "blocked";
  }

  async function handleDrop(leadId: string, stage: LeadStage) {
    setDragging(null);
    const lead = data.columns?.flatMap((c) => c.items).find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (!canTransitionLead(lead.stage, stage)) {
      push({ title: t("invalidMoveTitle"), description: t("invalidMoveBody"), tone: "info" });
      return;
    }
    if (stage === "lost") {
      setPendingLost({ lead, stage });
      return;
    }
    try {
      upsert(await repository.changeStage(leadId, { stage }));
      push({
        title: t("movedTitle"),
        description: t("movedBody", { stage: t(`stages.${stage}`) }),
        tone: "success",
      });
    } catch (err) {
      feedback.error(err, t("stageError"));
    }
  }

  async function restore(ids: string[]) {
    try {
      await repository.restore(ids);
      data.reloadAll();
      push({ title: t("delete.restored", { count: ids.length }), tone: "success" });
    } catch (err) {
      feedback.error(err, t("delete.restoreError"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.length) return;
    const ids = pendingDelete.map((l) => l.id);
    setDeleting(true);
    try {
      await repository.remove(ids);
      data.dropLeads(ids);
      setSelected((cur) => cur.filter((id) => !ids.includes(id)));
      setDetail((cur) => (cur && ids.includes(cur.id) ? null : cur));
      push({
        title: t("delete.done", { count: ids.length }),
        description: ids.length === 1 ? pendingDelete[0].fullName : undefined,
        tone: "success",
        durationMs: 8000,
        action: { label: t("delete.undo"), onClick: () => void restore(ids) },
      });
      setPendingDelete(null);
    } catch (err) {
      feedback.error(err, t("delete.error"));
    } finally {
      setDeleting(false);
    }
  }

  const isFiltered =
    search.length > 0 || ownerFilter !== "all" || sourceFilter !== "all" || noFollowOnly || stageFilter !== "all";

  const sections = [
    {
      id: "owner",
      label: t("fields.owner"),
      value: ownerFilter,
      onChange: setOwnerFilter,
      options: [
        { value: "all", label: t("filterAll") },
        ...owners.map((o) => ({ value: o.owner_id, label: o.owner_name || o.owner_id })),
      ],
    },
    {
      id: "source",
      label: t("fields.source"),
      value: sourceFilter,
      onChange: setSourceFilter,
      options: [{ value: "all", label: t("filterAll") }, ...sources.map((s) => ({ value: s.source, label: s.source }))],
    },
    {
      id: "nofollow",
      label: t("noFollowUp"),
      value: noFollowOnly ? "yes" : "all",
      onChange: (v: string) => setNoFollowOnly(v === "yes"),
      options: [
        { value: "all", label: t("filterAll") },
        { value: "yes", label: t("noFollowUpYes") },
      ],
    },
    ...(view === "table"
      ? [
          {
            id: "stage",
            label: t("list.stage"),
            value: stageFilter,
            onChange: (v: string) => setStageFilter(v as "all" | LeadStage),
            options: [
              { value: "all", label: t("filterAll") },
              ...LEAD_STAGES.map((s) => ({ value: s, label: t(`stages.${s}`) })),
            ],
          },
        ]
      : []),
  ];

  const pageCount = Math.max(1, Math.ceil(data.rowTotal / TABLE_PAGE_SIZE));
  useEffect(() => {
    if (tablePage > 0 && tablePage >= pageCount) setTablePage(pageCount - 1);
  }, [tablePage, pageCount]);

  return (
    <Screen>
      <PipelineHeader
        view={view}
        onViewChange={setView}
        actions={
          <CreateLeadDialog
            repository={repository}
            trigger={
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
                data-testid="pipeline-new-lead"
              >
                <UserPlus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {t("create")}
              </button>
            }
            onCreated={(lead) => {
              upsert(lead);
              void createTaskRepository()
                .ensureFollowUpForLead({
                  leadId: lead.id,
                  leadName: lead.fullName,
                  assigneeId: lead.ownerId,
                  assigneeName: lead.ownerName,
                  customerId: lead.customerId,
                })
                .catch((err: unknown) => feedback.error(err));
              push({ title: t("createdToastTitle"), description: t("createdToastBody"), tone: "success" });
            }}
          />
        }
      />
      <div
        className="flex flex-col gap-3 min-[1440px]:flex-row min-[1440px]:items-start min-[1440px]:gap-4"
        data-testid="pipeline-toolbar"
      >
        <div className="min-w-0 min-[1440px]:max-w-2xl min-[1440px]:flex-1">
          <SearchFilterBar
            variant="hero"
            value={search}
            onValueChange={setSearch}
            placeholder={t("searchPlaceholder")}
            clearLabel={tc("clearSearch")}
            filterLabel={tc("filter")}
            resetLabel={tc("resetFilters")}
            isFiltered={isFiltered}
            onReset={() => {
              setSearch("");
              setOwnerFilter("all");
              setSourceFilter("all");
              setStageFilter("all");
              setNoFollowOnly(false);
            }}
            sections={sections}
          />
        </div>
        <div className="min-[1440px]:ms-auto min-[1440px]:w-[40rem]">
          <PipelineStats
            columns={data.columns}
            locale={locale}
            noFollowOnly={noFollowOnly}
            onToggleNoFollow={() => setNoFollowOnly((v) => !v)}
          />
        </div>
      </div>

      <PipelinePeriodBar
        period={period}
        onPeriodChange={setPeriod}
        sort={sort}
        onSortChange={setSort}
        total={view === "table" ? (data.rowsLoading && !data.rows.length ? null : data.rowTotal) : total}
        locale={locale}
        busy={data.boardLoading || data.rowsLoading}
      />

      {view === "kanban" ? (
        !data.columns ? (
          <QueryState
            loading={data.boardLoading}
            loadingLabel={tc("loading")}
            error={data.boardError}
            onRetry={() => void data.reloadBoard()}
          >
            {null}
          </QueryState>
        ) : (
          <div
            ref={boardRef}
            className="-mx-1 flex cursor-grab gap-3.5 overflow-x-auto px-1 pb-3 select-none [scrollbar-width:thin] data-[panning]:cursor-grabbing data-[panning]:*:pointer-events-none"
            data-testid="pipeline-board"
          >
            {PIPELINE_COLUMNS.map((stage) => {
              const lane = data.columns?.find((c) => c.stage === stage) ?? {
                stage,
                total: 0,
                noFollowUp: 0,
                budgets: [],
                items: [],
              };
              return (
                <PipelineColumn
                  key={stage}
                  lane={lane}
                  busy={data.boardLoading}
                  loadingMore={data.loadingStages.has(stage)}
                  onLoadMore={data.loadMore}
                  locale={locale}
                  repository={repository}
                  canWrite={canWrite}
                  dropState={dropStateFor(stage)}
                  draggingId={dragging?.id ?? null}
                  onChanged={upsert}
                  onDropLead={(id, s) => void handleDrop(id, s)}
                  onOpenLead={setDetail}
                  onEditLead={setEditing}
                  onDragStart={setDragging}
                  onDragEnd={() => setDragging(null)}
                />
              );
            })}
          </div>
        )
      ) : data.rowsError && !data.rows.length ? (
        <QueryState loading={false} loadingLabel={tc("loading")} error={data.rowsError} onRetry={data.reloadAll}>
          {null}
        </QueryState>
      ) : (
        <PipelineTable
          leads={data.rows}
          locale={locale}
          repository={repository}
          canWrite={canWrite}
          canDelete={canDelete}
          onChanged={upsert}
          selectedIds={selected}
          onSelectionChange={setSelected}
          onOpenLead={setDetail}
          onEditLead={setEditing}
          onDeleteSelected={(ids) => setPendingDelete(data.rows.filter((l) => ids.includes(l.id)))}
          total={data.rowTotal}
          page={tablePage}
          pageSize={TABLE_PAGE_SIZE}
          onPageChange={(p) => {
            setTablePage(p);
            setSelected([]);
          }}
          loading={data.rowsLoading}
        />
      )}

      <LostReasonDialog
        open={Boolean(pendingLost)}
        onOpenChange={(open) => {
          if (!open) setPendingLost(null);
        }}
        lead={pendingLost?.lead ?? null}
        repository={repository}
        onDone={(lead) => {
          upsert(lead);
          setPendingLost(null);
          push({
            title: t("movedTitle"),
            description: t("movedBody", { stage: t("stages.lost") }),
            tone: "success",
          });
        }}
      />

      <LeadFormDialog
        repository={repository}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        lead={editing}
        onSaved={(lead) => {
          upsert(lead);
          push({ title: t("savedTitle"), description: lead.fullName, tone: "success" });
        }}
      />

      <LeadDetailDrawer
        lead={detail}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        repository={repository}
        onChanged={upsert}
        onDelete={canDelete ? (lead) => setPendingDelete([lead]) : undefined}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("delete.confirmTitle", { count: pendingDelete?.length ?? 1 })}
        description={
          pendingDelete?.length === 1
            ? t("delete.confirmOne", { name: pendingDelete[0].fullName })
            : t("delete.confirmMany", { count: pendingDelete?.length ?? 0 })
        }
        confirmLabel={t("delete.confirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() => void confirmDelete()}
        pending={deleting}
        destructive
      />
    </Screen>
  );
}
