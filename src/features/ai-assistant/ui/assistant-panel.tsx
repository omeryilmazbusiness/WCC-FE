"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { conversationTitle, type AssistantTransport } from "@/entities/assistant";
import { useViewer } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { useAssistant } from "../model/assistant-context";
import { useAssistantConversations } from "../model/use-assistant-conversations";
import { AssistantEmpty } from "./assistant-empty";
import { AssistantOrb } from "./assistant-orb";
import { Composer, type ComposerHandle } from "./composer";
import { ConversationTabs, conversationTabId } from "./conversation-tabs";
import { MessageItem } from "./message-item";

export const ASSISTANT_PANEL_ID = "wodi-assistant-panel";
const THREAD_ID = `${ASSISTANT_PANEL_ID}-thread`;

type Props = {
  transport: AssistantTransport;
  /** Human label of the current screen, sent as context and shown in the composer. */
  screenLabel?: string;
  screen?: string;
  branchId?: string;
};

const NEAR_BOTTOM_PX = 96;

/**
 * Right-hand vertical chat panel with up to three conversation tabs. It stays mounted
 * so chats survive closing it and moving between screens; while closed it is `inert`.
 */
export function AssistantPanel({ transport, screenLabel, screen, branchId }: Props) {
  const t = useTranslations("assistant");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const { user } = useViewer();
  const { enabled, open, setOpen, pendingPrompt, clearPendingPrompt } = useAssistant();
  const context = useMemo(() => ({ locale, screen, branchId }) as const, [locale, screen, branchId]);
  const chats = useAssistantConversations(transport, context);
  const { active } = chats;
  const messages = active.chat.messages;

  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const id = window.setTimeout(() => composerRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back && panelRef.current?.contains(document.activeElement)) back.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Leave Escape to any Radix dialog opened above the shell.
      if (document.querySelector(`[role='dialog'][data-state='open']:not(#${ASSISTANT_PANEL_ID})`)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const { send } = chats;
  useEffect(() => {
    if (!open || !pendingPrompt) return;
    if (send(pendingPrompt)) clearPendingPrompt();
  }, [open, pendingPrompt, send, clearPendingPrompt]);

  // Drop drafts of closed tabs.
  const liveIds = chats.conversations.map((c) => c.id).join(",");
  useEffect(() => {
    setDrafts((d) => {
      const ids = new Set(liveIds.split(","));
      const kept = Object.entries(d).filter(([id]) => ids.has(id));
      return kept.length === Object.keys(d).length ? d : Object.fromEntries(kept);
    });
  }, [liveIds]);

  // A different tab starts at its latest message.
  useEffect(() => {
    setAtBottom(true);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active.id]);

  const last = messages.at(-1);
  const scrollKey = `${active.id}:${messages.length}:${last?.content.length ?? 0}:${last?.status ?? ""}`;
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight });
    // Follow the stream only while the reader is already at the bottom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  function onScroll() {
    const el = scrollRef.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX);
  }

  const focusComposerSoon = () => requestAnimationFrame(() => composerRef.current?.focus());

  function jumpToBottom() {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  if (!enabled) return null;

  const firstName = user.fullName.trim().split(/\s+/)[0] ?? "";
  const anyStreaming = chats.conversations.some((c) => c.chat.messages.some((m) => m.status === "streaming"));

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-zinc-950/25 backdrop-blur-[2px] transition-opacity duration-300 sm:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        id={ASSISTANT_PANEL_ID}
        role="dialog"
        aria-modal={false}
        aria-labelledby={`${ASSISTANT_PANEL_ID}-title`}
        data-state={open ? "open" : "closed"}
        inert={!open}
        className={cn(
          "fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#F5F5F7]/95 backdrop-blur-2xl",
          // Docked under the 56px header so its assistant icon keeps toggling the panel.
          "sm:bottom-3 sm:end-3 sm:start-auto sm:top-[68px] sm:w-[420px] sm:rounded-[28px] sm:shadow-[0_30px_80px_-24px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.06)]",
          "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0 opacity-100" : "pointer-events-none opacity-0 ltr:translate-x-[calc(100%+1.5rem)] rtl:-translate-x-[calc(100%+1.5rem)]",
        )}
        data-testid="assistant-panel"
      >
        <header className="flex items-center gap-2.5 border-b border-zinc-950/[0.05] bg-white/70 py-2.5 pe-2.5 ps-4 backdrop-blur-xl">
          <AssistantOrb size="sm" still={!anyStreaming} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 id={`${ASSISTANT_PANEL_ID}-title`} className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">
                {t("title")}
              </h2>
              {transport.mode === "preview" ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-700" data-testid="assistant-preview-badge">
                  {t("preview")}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[12px] text-zinc-500" data-testid="assistant-subtitle">
              {chats.streaming ? t("typing") : (conversationTitle(active) ?? t("subtitle"))}
            </p>
          </div>
          <ConversationTabs
            conversations={chats.conversations}
            activeId={active.id}
            panelId={THREAD_ID}
            canOpen={chats.canOpen}
            onSelect={(id, viaKeyboard) => {
              chats.select(id);
              if (!viaKeyboard) focusComposerSoon();
            }}
            onOpen={() => {
              chats.open();
              focusComposerSoon();
            }}
            onClose={(id) => {
              chats.close(id);
              focusComposerSoon();
            }}
          />
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            title={t("close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-950/[0.05] hover:text-zinc-900"
            data-testid="assistant-close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            id={THREAD_ID}
            role="tabpanel"
            aria-labelledby={conversationTabId(active.id)}
            onScroll={onScroll}
            className="h-full overflow-y-auto overscroll-contain px-4 py-4"
            aria-live="polite"
            aria-busy={chats.streaming}
            data-testid="assistant-thread"
          >
            {messages.length === 0 ? (
              <AssistantEmpty key={active.id} firstName={firstName} onPick={chats.send} />
            ) : (
              <div className="space-y-5">
                {messages.map((m, i) => (
                  <MessageItem key={m.id} message={m} isLast={i === messages.length - 1} onRetry={chats.retry} onFeedback={chats.feedback} />
                ))}
              </div>
            )}
          </div>
          {!atBottom ? (
            <button
              type="button"
              onClick={jumpToBottom}
              aria-label={t("scrollDown")}
              className="animate-assistant-pop absolute bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white text-zinc-600 shadow-[0_6px_18px_-8px_rgba(15,23,42,0.45)] ring-1 ring-zinc-950/[0.06] hover:text-zinc-900"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <footer className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
          <Composer
            ref={composerRef}
            value={drafts[active.id] ?? ""}
            onValueChange={(value) => setDrafts((d) => ({ ...d, [active.id]: value }))}
            streaming={chats.streaming}
            onSend={chats.send}
            onStop={chats.stop}
            contextLabel={screenLabel}
          />
          <p className="mt-2 px-2 text-center text-[11px] leading-snug text-zinc-400">{t("disclaimer")}</p>
        </footer>
      </aside>
    </>
  );
}
