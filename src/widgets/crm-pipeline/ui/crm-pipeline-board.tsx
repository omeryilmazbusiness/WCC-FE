"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  canTransitionLead,
  groupLeadsByStage,
  PIPELINE_COLUMNS,
  type Lead,
  type LeadRepository,
  type LeadStage,
} from "@/entities/lead";
import { CreateLeadDialog } from "@/features/create-lead";
import { LostReasonDialog } from "@/features/change-lead-stage";
import { getMemoryTaskRepository } from "@/entities/task";
import {
  ListScreen,
  SearchFilterBar,
  SegmentedControl,
  EmptyState,
  useToast,
} from "@/shared/ui";
import { PipelineColumn } from "./pipeline-column";
import { PipelineTable } from "./pipeline-table";

type ViewMode = "kanban" | "table";

type Props = {
  repository: LeadRepository;
  initialLeads: Lead[];
};

export function CrmPipelineBoard({ repository, initialLeads }: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [pendingLost, setPendingLost] = useState<{
    lead: Lead;
    stage: LeadStage;
  } | null>(null);

  function upsert(lead: Lead) {
    setLeads((prev) => {
      const rest = prev.filter((l) => l.id !== lead.id);
      return [lead, ...rest];
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (ownerFilter !== "all" && l.ownerId !== ownerFilter) return false;
      if (!q) return true;
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q)
      );
    });
  }, [leads, query, ownerFilter]);

  const byStage = useMemo(() => groupLeadsByStage(filtered), [filtered]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) map.set(l.ownerId, l.ownerName);
    return [...map.entries()];
  }, [leads]);

  async function handleDrop(leadId: string, stage: LeadStage) {
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
    } catch {
      push({ title: t("stageError"), tone: "error" });
    }
  }

  const isFiltered = query.length > 0 || ownerFilter !== "all";

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
          <CreateLeadDialog
            repository={repository}
            onCreated={(lead) => {
              upsert(lead);
              void getMemoryTaskRepository().ensureFollowUpForLead({
                leadId: lead.id,
                leadName: lead.fullName,
                assigneeId: lead.ownerId,
                assigneeName: lead.ownerName,
                customerId: lead.customerId,
              });
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
          ]}
        />
      }
    >
      {view === "kanban" ? (
        filtered.length === 0 ? (
          <EmptyState title={t("empty")} description={t("emptyHint")} />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PIPELINE_COLUMNS.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={byStage[stage]}
                repository={repository}
                onChanged={upsert}
                onDropLead={(id, s) => void handleDrop(id, s)}
              />
            ))}
          </div>
        )
      ) : (
        <PipelineTable
          leads={filtered}
          repository={repository}
          onChanged={upsert}
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
    </ListScreen>
  );
}
