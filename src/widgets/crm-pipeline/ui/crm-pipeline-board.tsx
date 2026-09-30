"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  canTransitionLead,
  groupLeadsByStage,
  PIPELINE_COLUMNS,
  type Lead,
  type LeadRepository,
  type LeadStage,
} from "@/entities/lead";
import { CreateLeadDialog, LeadFormDialog } from "@/features/create-lead";
import { LostReasonDialog } from "@/features/change-lead-stage";
import { BulkAssignLeadsDialog } from "@/features/bulk-assign-leads";
import { LeadDetailDrawer } from "@/features/lead-detail";
import { createTaskRepository } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { useDragScroll } from "@/shared/lib/use-drag-scroll";
import {
  ListScreen,
  SearchFilterBar,
  SegmentedControl,
  useToast,
  useMutationFeedback,
} from "@/shared/ui";
import { PipelineColumn, type DropState } from "./pipeline-column";
import { PipelineTable } from "./pipeline-table";

type ViewMode = "kanban" | "table";

type Props = {
  repository: LeadRepository;
  initialLeads: Lead[];
};

export function CrmPipelineBoard({ repository, initialLeads }: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canWrite = useCan("leads.write");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [noFollowOnly, setNoFollowOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dragging, setDragging] = useState<Lead | null>(null);
  const boardRef = useDragScroll<HTMLDivElement>();
  const [pendingLost, setPendingLost] = useState<{
    lead: Lead;
    stage: LeadStage;
  } | null>(null);

  function upsert(lead: Lead) {
    setLeads((prev) => {
      const rest = prev.filter((l) => l.id !== lead.id);
      return [lead, ...rest];
    });
    setDetail((cur) => (cur?.id === lead.id ? lead : cur));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (ownerFilter !== "all" && l.ownerId !== ownerFilter) return false;
      if (noFollowOnly && !l.noFollowUp) return false;
      if (!q) return true;
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q)
      );
    });
  }, [leads, query, ownerFilter, noFollowOnly]);

  const byStage = useMemo(() => groupLeadsByStage(filtered), [filtered]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) map.set(l.ownerId, l.ownerName || l.ownerId);
    return [...map.entries()];
  }, [leads]);

  function dropStateFor(stage: LeadStage): DropState {
    if (!dragging || dragging.stage === stage) return "idle";
    return canTransitionLead(dragging.stage, stage) ? "allowed" : "blocked";
  }

  async function handleDrop(leadId: string, stage: LeadStage) {
    setDragging(null);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (!canTransitionLead(lead.stage, stage)) {
      push({
        title: t("invalidMoveTitle"),
        description: t("invalidMoveBody"),
        tone: "info",
      });
      return;
    }
    if (stage === "lost") {
      setPendingLost({ lead, stage });
      return;
    }
    try {
      const updated = await repository.changeStage(leadId, { stage });
      upsert(updated);
      push({
        title: t("movedTitle"),
        description: t("movedBody", { stage: t(`stages.${stage}`) }),
        tone: "success",
      });
    } catch (err) {
      feedback.error(err, t("stageError"));
    }
  }

  const isFiltered =
    query.length > 0 || ownerFilter !== "all" || noFollowOnly;

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label={t("viewMode")}
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: t("kanban") },
              { value: "table", label: t("table") },
            ]}
          />
          <BulkAssignLeadsDialog
            selectedIds={selected}
            repository={repository}
            onAssigned={(updated) => {
              for (const l of updated) upsert(l);
              setSelected([]);
            }}
          />
          <CreateLeadDialog
            repository={repository}
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
              push({
                title: t("createdToastTitle"),
                description: t("createdToastBody"),
                tone: "success",
              });
            }}
          />
        </div>
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchPlaceholder")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={isFiltered}
          onReset={() => {
            setQuery("");
            setOwnerFilter("all");
            setNoFollowOnly(false);
          }}
          sections={[
            {
              id: "owner",
              label: t("fields.owner"),
              value: ownerFilter,
              onChange: setOwnerFilter,
              options: [
                { value: "all", label: t("filterAll"), count: leads.length },
                ...owners.map(([id, name]) => ({
                  value: id,
                  label: name,
                  count: leads.filter((l) => l.ownerId === id).length,
                })),
              ],
            },
            {
              id: "nofollow",
              label: t("noFollowUp"),
              value: noFollowOnly ? "yes" : "all",
              onChange: (v: string) => setNoFollowOnly(v === "yes"),
              options: [
                { value: "all", label: t("filterAll"), count: leads.length },
                {
                  value: "yes",
                  label: t("noFollowUpYes"),
                  count: leads.filter((l) => l.noFollowUp).length,
                },
              ],
            },
          ]}
        />
      }
    >
      {view === "kanban" ? (
        <div
          ref={boardRef}
          className="-mx-1 flex cursor-grab gap-3.5 overflow-x-auto px-1 pb-3 select-none [scrollbar-width:thin] data-[panning]:cursor-grabbing data-[panning]:*:pointer-events-none"
          data-testid="pipeline-board"
        >
          {PIPELINE_COLUMNS.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={byStage[stage]}
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
          ))}
        </div>
      ) : (
        <PipelineTable
          leads={filtered}
          repository={repository}
          onChanged={upsert}
          selectedIds={selected}
          onSelectionChange={setSelected}
          onOpenLead={setDetail}
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
      />
    </ListScreen>
  );
}
