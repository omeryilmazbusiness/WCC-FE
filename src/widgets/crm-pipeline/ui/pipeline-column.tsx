"use client";

import { useTranslations } from "next-intl";
import {
  canTransitionLead,
  type Lead,
  type LeadRepository,
  type LeadStage,
} from "@/entities/lead";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { ConvertLeadDialog } from "@/features/convert-lead";
import { LEAD_STAGE_TONES, StageBadge } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { LeadPriorityBadge } from "./lead-priority-badge";

type Props = {
  stage: LeadStage;
  leads: Lead[];
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
  onDropLead: (leadId: string, stage: LeadStage) => void;
  onOpenLead: (lead: Lead) => void;
};

export function PipelineColumn({
  stage,
  leads,
  repository,
  onChanged,
  onDropLead,
  onOpenLead,
}: Props) {
  const t = useTranslations("pipeline");

  return (
    <section
      className="flex min-h-[28rem] w-[17.5rem] shrink-0 flex-col rounded-[24px] border border-zinc-200/80 bg-zinc-50/80"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("text/lead-id");
        if (leadId) onDropLead(leadId, stage);
      }}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <StageBadge
          tone={LEAD_STAGE_TONES[stage]}
          label={t(`stages.${stage}`)}
        />
        <span className="rounded-xl bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-500 shadow-sm">
          {leads.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {leads.map((lead) => (
          <article
            key={lead.id}
            draggable={canTransitionLead(lead.stage, stage) || lead.stage === stage}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/lead-id", lead.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className={cn(
              "rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-[0_8px_24px_-18px_rgba(24,24,27,0.45)] transition-all duration-300",
              "cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
              lead.noFollowUp && "border-amber-300/80",
            )}
          >
            <button
              type="button"
              className="w-full text-start"
              onClick={() => onOpenLead(lead)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-950">{lead.fullName}</p>
                <LeadPriorityBadge leadId={lead.id} />
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-500">{lead.phone}</p>
              <p className="mt-2 truncate text-xs text-zinc-400">
                {lead.ownerName}
                {lead.source ? ` · ${lead.source}` : ""}
              </p>
              {lead.noFollowUp ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  {t("noFollowUpYes")}
                </p>
              ) : null}
              {lead.stage === "lost" && lead.lostReason ? (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                  {lead.lostReason}
                </p>
              ) : null}
            </button>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LeadStageMenu
                lead={lead}
                repository={repository}
                onChanged={onChanged}
              />
              <AssignLeadDialog
                lead={lead}
                repository={repository}
                onAssigned={onChanged}
              />
              <ConvertLeadDialog
                lead={lead}
                repository={repository}
                onConverted={(updated) => onChanged(updated)}
              />
            </div>
          </article>
        ))}
        {leads.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs font-medium text-zinc-400">
            {t("emptyColumn")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
