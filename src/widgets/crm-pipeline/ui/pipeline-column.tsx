"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { pipelineValue, stageLook, type Lead, type LeadRepository, type LeadStage } from "@/entities/lead";
import { cn } from "@/shared/lib/cn";
import { formatMoneyWhole } from "@/shared/lib/format";
import { TONES } from "@/shared/ui";
import { LeadCard } from "./lead-card";

/** How this column relates to the lead being dragged. */
export type DropState = "idle" | "allowed" | "blocked";

type Props = {
  stage: LeadStage;
  leads: Lead[];
  locale: string;
  repository: LeadRepository;
  canWrite: boolean;
  dropState: DropState;
  draggingId: string | null;
  onChanged: (lead: Lead) => void;
  onDropLead: (leadId: string, stage: LeadStage) => void;
  onOpenLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
};

/** One stage: a fixed-height lane whose cards scroll inside it. */
export function PipelineColumn({
  stage,
  leads,
  locale,
  repository,
  canWrite,
  dropState,
  draggingId,
  onChanged,
  onDropLead,
  onOpenLead,
  onEditLead,
  onDragStart,
  onDragEnd,
}: Props) {
  const t = useTranslations("pipeline");
  const look = stageLook(stage);
  const Icon = look.icon;
  const value = pipelineValue(leads);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const resetOver = () => {
    depth.current = 0;
    setOver(false);
  };

  return (
    <section
      aria-label={t(`stages.${stage}`)}
      data-testid={`pipeline-column-${stage}`}
      data-drop={dropState}
      onDragEnter={(e) => {
        if (dropState !== "allowed") return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (dropState !== "allowed") return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={() => {
        if (dropState !== "allowed") return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        resetOver();
        const leadId = e.dataTransfer.getData("text/lead-id");
        if (leadId && dropState === "allowed") onDropLead(leadId, stage);
      }}
      className={cn(
        "flex h-[calc(100dvh-17.5rem)] min-h-[36rem] w-[18.5rem] shrink-0 flex-col rounded-[28px] border bg-gradient-to-b transition-all duration-200",
        TONES[look.tone].tint,
        "border-zinc-200/60 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.4)]",
        dropState === "blocked" && "opacity-45 saturate-50",
        dropState === "allowed" && "border-dashed border-zinc-300",
        over && "border-solid border-zinc-900/70 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] ring-4 ring-zinc-900/5",
      )}
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient)}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{t(`stages.${stage}`)}</h2>
          <p className="truncate text-[11.5px] font-medium text-zinc-500" data-testid="pipeline-column-value">
            {value
              ? `${formatMoneyWhole(value.amount, locale, value.currency)}${value.partial ? " *" : ""}`
              : t("column.noBudget")}
          </p>
        </div>
        <span
          className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums", TONES[look.tone].soft)}
          data-testid="pipeline-column-count"
        >
          {leads.length}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain px-3 pb-3 [scrollbar-gutter:stable] [scrollbar-width:thin]">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            locale={locale}
            repository={repository}
            canWrite={canWrite}
            dragging={draggingId === lead.id}
            onChanged={onChanged}
            onOpen={onOpenLead}
            onEdit={onEditLead}
            onDragStart={onDragStart}
            onDragEnd={() => {
              resetOver();
              onDragEnd();
            }}
          />
        ))}
        {leads.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed px-4 py-8 text-center transition-colors",
              over ? "border-zinc-900/40 bg-white/80" : "border-zinc-200/80",
            )}
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONES[look.tone].soft)}>
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-[12px] font-medium text-zinc-400">{t("emptyColumn")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
