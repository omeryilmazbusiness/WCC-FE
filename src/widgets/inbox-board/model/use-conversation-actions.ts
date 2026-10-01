"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createAIRepository } from "@/entities/ai";
import type {
  Conversation,
  ConversationRepository,
  ConversationStatus,
  InboxMessage,
  NextTaskOutcome,
  NextTaskSuggestion,
} from "@/entities/conversation";
import { createTaskRepository } from "@/entities/task";
import type { SessionUser } from "@/shared/api/session";
import { useMutationFeedback, useToast } from "@/shared/ui";

export type ActionKey = "reply" | "assign" | ConversationStatus | "task" | "outcome" | "confirm" | "assist";

type Assist = { summary: string; nextStep: string };

type Options = {
  repository: ConversationRepository;
  conversation: Conversation | null;
  user: SessionUser;
  /** Server copy after a change, so the list can update in place. */
  onUpdated: (conversation: Conversation) => void;
  onMessage: (message: InboxMessage) => void;
};

/** Everything an agent can do to the open conversation, with one shared pending state and feedback. */
export function useConversationActions({ repository, conversation, user, onUpdated, onMessage }: Options) {
  const t = useTranslations("inbox");
  const tNext = useTranslations("nextTask");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const aiRepo = useMemo(() => createAIRepository(), []);
  const taskRepo = useMemo(() => createTaskRepository(), []);
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [scoped, setScoped] = useState<{
    id: string | null;
    outcome: NextTaskOutcome | null;
    suggestion: NextTaskSuggestion | null;
    assist: Assist | null;
  }>({ id: null, outcome: null, suggestion: null, assist: null });

  const id = conversation?.id ?? null;
  const own = scoped.id === id ? scoped : { id, outcome: null, suggestion: null, assist: null };

  async function run<T>(key: ActionKey, fn: (c: Conversation) => Promise<T>, errorTitle = t("actionError")) {
    if (!conversation || pending) return undefined;
    setPending(key);
    try {
      return await fn(conversation);
    } catch (err) {
      feedback.error(err, errorTitle);
      return undefined;
    } finally {
      setPending(null);
    }
  }

  async function reply(body: string, internalNote: boolean): Promise<boolean> {
    const msg = await run("reply", (c) => repository.reply(c.id, body, { internalNote }));
    if (!msg) return false;
    onMessage(msg);
    push({ title: internalNote ? t("noteSaved") : t("replySent"), tone: "success" });
    return true;
  }

  async function assign(ownerId: string) {
    const next = await run("assign", (c) => repository.assign(c.id, ownerId));
    if (!next) return;
    onUpdated(next);
    feedback.success(t("assigned"));
  }

  async function setStatus(status: ConversationStatus) {
    const next = await run(status, (c) => repository.setStatus(c.id, status));
    if (!next) return;
    onUpdated(next);
    feedback.success(t(`statusDone.${status}`));
  }

  async function createTask() {
    const done = await run("task", (c) =>
      taskRepo.create({
        title: t("taskTitle", { name: c.subject || c.contactName || c.identityLabel }),
        kind: "followup",
        assigneeId: c.ownerId ?? user.id,
        assigneeName: c.ownerName || user.fullName,
        relatedType: "conversation",
        relatedId: c.id,
        relatedLabel: c.subject || c.identityLabel,
      }),
    );
    if (done) feedback.success(t("taskCreated"));
  }

  async function suggest(outcome: NextTaskOutcome) {
    const s = await run("outcome", (c) => repository.suggestNextTask(c.id, outcome));
    if (!s) return;
    setScoped({ ...own, outcome, suggestion: s });
    push({ title: tNext("suggested"), tone: "info" });
  }

  async function confirm() {
    const outcome = own.outcome;
    if (!outcome) return;
    const done = await run("confirm", (c) => repository.confirmNextTask(c.id, outcome));
    if (!done) return;
    setScoped({ ...own, outcome: null, suggestion: null });
    push({ title: tNext("confirmed"), description: done.title, tone: "success" });
  }

  /** Returns the AI reply draft, if any, for the composer. */
  async function assist(): Promise<string> {
    const out = await run("assist", (c) => aiRepo.conversationAssist(c.id), t("aiAssistError"));
    if (!out) return "";
    setScoped({ ...own, assist: { summary: out.summary || "", nextStep: out.nextStep || "" } });
    feedback.success(t("aiAssistDone"));
    return out.replyDraft || "";
  }

  return {
    pending,
    outcome: own.outcome,
    suggestion: own.suggestion,
    assistNote: own.assist,
    reply,
    assign,
    setStatus,
    createTask,
    suggest,
    confirm,
    assist,
  };
}

export type ConversationActions = ReturnType<typeof useConversationActions>;
