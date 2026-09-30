"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft, ChevronDown } from "lucide-react";
import {
  canTransitionLead,
  nextStages,
  type Lead,
  type LeadRepository,
  type LeadStage,
} from "@/entities/lead";
import { useCan } from "@/entities/viewer";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StageBadge,
  LEAD_STAGE_TONES,
  useToast,
  useMutationFeedback,
} from "@/shared/ui";
import { LostReasonDialog } from "./lost-reason-dialog";

type Props = {
  lead: Lead;
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
  /** `icon` renders a bare move button, for places where the stage is already visible. */
  trigger?: "badge" | "icon";
  triggerClassName?: string;
};

export function LeadStageMenu({ lead, repository, onChanged, trigger = "badge", triggerClassName }: Props) {
  const t = useTranslations("pipeline");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const canWrite = useCan("leads.write");
  const [lostOpen, setLostOpen] = useState(false);
  const options = nextStages(lead.stage);

  async function moveTo(stage: LeadStage) {
    if (!canTransitionLead(lead.stage, stage)) return;
    if (stage === "lost") {
      setLostOpen(true);
      return;
    }
    try {
      const updated = await repository.changeStage(lead.id, { stage });
      onChanged(updated);
      push({
        title: t("movedTitle"),
        description: t("movedBody", { stage: t(`stages.${stage}`) }),
        tone: "success",
      });
    } catch (err) {
      feedback.error(err, t("stageError"));
    }
  }

  if (!canWrite) {
    if (trigger === "icon") return null;
    return (
      <StageBadge
        tone={LEAD_STAGE_TONES[lead.stage]}
        label={t(`stages.${lead.stage}`)}
      />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger === "icon" ? (
            <button
              type="button"
              aria-label={t("moveTo")}
              title={t("moveTo")}
              data-testid="lead-stage-move"
              className={triggerClassName}
            >
              <ArrowRightLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-1.5" title={t("moveTo")}>
              <StageBadge
                tone={LEAD_STAGE_TONES[lead.stage]}
                label={t(`stages.${lead.stage}`)}
              />
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[11rem]">
          <DropdownMenuLabel>{t("moveTo")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.length === 0 ? (
            <DropdownMenuItem disabled>{t("terminalStage")}</DropdownMenuItem>
          ) : (
            options.map((stage) => (
              <DropdownMenuItem key={stage} onSelect={() => void moveTo(stage)}>
                {t(`stages.${stage}`)}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <LostReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        lead={lead}
        repository={repository}
        onDone={onChanged}
      />
    </>
  );
}
