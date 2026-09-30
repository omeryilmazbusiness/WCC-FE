"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, UserPlus, UserRoundPen } from "lucide-react";
import { createAIRepository, isAINotConfigured } from "@/entities/ai";
import type { Conversation, ConversationRepository } from "@/entities/conversation";
import { createLeadRepository, type Lead } from "@/entities/lead";
import { useCan } from "@/entities/viewer";
import { LeadFormDialog, type LeadPrefill } from "@/features/create-lead";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { Button, useMutationFeedback } from "@/shared/ui";
import { mergeDraftIntoLead, prefillFromContact, prefillFromDraft } from "../model/prefill";

type Props = {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  /** Called after a new lead was created and linked to the conversation. */
  onLinked: () => void;
};

type DialogState = {
  lead: Lead | null;
  prefill: LeadPrefill;
  aiFields: string[];
};

/** Turns a conversation into a lead: AI reads the chat and fills the form. */
export function LeadFromConversation({ conversation, conversationRepository, onLinked }: Props) {
  const t = useTranslations("inbox");
  const canWrite = useCan("leads.write");
  const canAI = useCan("ai.write");
  const canSetupAI = useCan("ai.setup");
  const feedback = useMutationFeedback();
  const aiRepo = useMemo(() => createAIRepository(), []);
  const leadRepo = useMemo(() => createLeadRepository(), []);
  const [busy, setBusy] = useState(false);
  const [needsAI, setNeedsAI] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const hasLead = Boolean(conversation.leadId);

  if (!canWrite) return null;

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

  return (
    <div className="flex flex-col gap-2">
      {canAI ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void fillWithAI()}
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-500 px-3.5 py-2.5 text-start text-white shadow-[0_12px_30px_-16px_rgba(124,58,237,0.8)] transition-all duration-300 hover:shadow-[0_16px_36px_-14px_rgba(124,58,237,0.9)] disabled:opacity-70"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {busy ? t("leadDraftReading") : hasLead ? t("leadDraftComplete") : t("leadDraftCreate")}
            </span>
            <span className="block truncate text-xs text-white/80">{t("leadDraftHint")}</span>
          </span>
        </button>
      ) : null}

      {needsAI ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 px-3 py-2.5 text-xs text-violet-900">
          <p>{t("leadDraftNoAI")}</p>
          {canSetupAI ? (
            <Link href={routes.aiSetup} className="mt-1 inline-block font-semibold text-violet-700 hover:underline">
              {t("leadDraftConnect")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <Button type="button" size="sm" variant="outline" onClick={() => void openManually()}>
        {hasLead ? <UserRoundPen className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {hasLead ? t("editLead") : t("createLead")}
      </Button>

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
    </div>
  );
}
