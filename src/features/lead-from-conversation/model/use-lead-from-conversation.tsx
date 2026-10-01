"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { createAIRepository, isAINotConfigured } from "@/entities/ai";
import type { Conversation, ConversationRepository } from "@/entities/conversation";
import { createLeadRepository, type Lead } from "@/entities/lead";
import { useCan } from "@/entities/viewer";
import { LeadFormDialog, type LeadPrefill } from "@/features/create-lead";
import { useMutationFeedback } from "@/shared/ui";
import { mergeDraftIntoLead, prefillFromContact, prefillFromDraft } from "./prefill";

type DialogState = {
  lead: Lead | null;
  prefill: LeadPrefill;
  aiFields: string[];
};

export type LeadFromConversation = {
  /** False when the viewer cannot write leads; render nothing then. */
  enabled: boolean;
  canAI: boolean;
  canSetupAI: boolean;
  hasLead: boolean;
  busy: boolean;
  /** AI provider missing; show the connect hint instead of failing silently. */
  needsAI: boolean;
  fillWithAI: () => Promise<void>;
  openManually: () => Promise<void>;
  /** The lead form; render it once anywhere in the tree. */
  dialog: ReactNode;
};

/** Turns a conversation into a lead: AI reads the chat and fills the form, or the agent fills it by hand. */
export function useLeadFromConversation(
  conversation: Conversation,
  conversationRepository: ConversationRepository,
  onLinked: () => void,
): LeadFromConversation {
  const t = useTranslations("inbox");
  const enabled = useCan("leads.write");
  const canAI = useCan("ai.write");
  const canSetupAI = useCan("ai.setup");
  const feedback = useMutationFeedback();
  const aiRepo = useMemo(() => createAIRepository(), []);
  const leadRepo = useMemo(() => createLeadRepository(), []);
  const [busy, setBusy] = useState(false);
  const [needsAI, setNeedsAI] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  async function fillWithAI() {
    setBusy(true);
    try {
      const res = await aiRepo.leadDraft(conversation.id);
      const leadId = res.leadId ?? conversation.leadId;
      if (leadId) {
        const lead = await leadRepo.getById(leadId);
        setDialog({ lead, prefill: mergeDraftIntoLead(lead, res.draft), aiFields: res.draft.aiFields });
      } else {
        setDialog({ lead: null, prefill: prefillFromDraft(conversation, res.draft), aiFields: res.draft.aiFields });
      }
      if (res.draft.aiFields.length === 0) feedback.success(t("leadDraftNothing"));
    } catch (err) {
      if (isAINotConfigured(err)) setNeedsAI(true);
      else feedback.error(err, t("leadDraftError"));
    } finally {
      setBusy(false);
    }
  }

  async function openManually() {
    try {
      if (conversation.leadId) {
        const lead = await leadRepo.getById(conversation.leadId);
        setDialog({ lead, prefill: {}, aiFields: [] });
      } else {
        setDialog({ lead: null, prefill: prefillFromContact(conversation), aiFields: [] });
      }
    } catch (err) {
      feedback.error(err, t("actionError"));
    }
  }

  async function onSaved(lead: Lead) {
    if (dialog?.lead) {
      feedback.success(t("leadUpdated"));
      return;
    }
    try {
      await conversationRepository.linkLead(conversation.id, lead.id);
      feedback.success(t("leadCreated"));
      onLinked();
    } catch (err) {
      feedback.error(err, t("actionError"));
    }
  }

  return {
    enabled,
    canAI,
    canSetupAI,
    hasLead: Boolean(conversation.leadId),
    busy,
    needsAI,
    fillWithAI,
    openManually,
    dialog: enabled ? (
      <LeadFormDialog
        repository={leadRepo}
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        lead={dialog?.lead ?? null}
        prefill={dialog?.prefill}
        aiFields={dialog?.aiFields}
        onSaved={(lead) => void onSaved(lead)}
      />
    ) : null,
  };
}
