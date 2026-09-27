"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
};

export function LeadStageMenu({ lead, repository, onChanged }: Props) {
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
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
            <StageBadge
              tone={LEAD_STAGE_TONES[lead.stage]}
              label={t(`stages.${lead.stage}`)}
            />
          </Button>
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
