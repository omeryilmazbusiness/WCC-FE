"use client";

import { useRef, type KeyboardEvent } from "react";
import { MessageCircle, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { conversationTitle, isConversationStreaming, type Conversation } from "@/entities/assistant";
import { cn } from "@/shared/lib/cn";

export const conversationTabId = (id: string) => `assistant-tab-${id}`;

type Props = {
  conversations: readonly Conversation[];
  activeId: string;
  panelId: string;
  canOpen: boolean;
  /** `viaKeyboard` keeps focus on the tab while arrowing through them. */
  onSelect: (id: string, viaKeyboard: boolean) => void;
  onOpen: () => void;
  onClose: (id: string) => void;
};

/**
 * Compact icon capsule, one glyph per open conversation, that sits in the panel header.
 * The full title lives in the tooltip / accessible name and in the header subtitle.
 */
export function ConversationTabs({ conversations, activeId, panelId, canOpen, onSelect, onOpen, onClose }: Props) {
  const t = useTranslations("assistant.tabs");
  const list = useRef<HTMLDivElement>(null);
  const closable = conversations.length > 1 || conversations[0]?.chat.messages.length > 0;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = conversations.findIndex((c) => c.id === activeId);
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key as "ArrowRight" | "ArrowLeft"];
    let next = -1;
    if (step) next = (index + step + conversations.length) % conversations.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = conversations.length - 1;
    else if ((e.key === "Delete" || e.key === "Backspace") && closable) {
      e.preventDefault();
      onClose(activeId);
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    const id = conversations[next].id;
    onSelect(id, true);
    list.current?.querySelector<HTMLElement>(`#${CSS.escape(conversationTabId(id))}`)?.focus();
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-zinc-950/[0.045] p-[3px]" data-testid="assistant-tabs">
      <div ref={list} role="tablist" aria-label={t("label")} onKeyDown={onKeyDown} className="flex items-center gap-0.5">
        {conversations.map((c, i) => {
          const selected = c.id === activeId;
          const title = conversationTitle(c) ?? t("untitled");
          const busy = isConversationStreaming(c);
          const label = `${i + 1}. ${title}`;
          return (
            <div key={c.id} className="group relative animate-assistant-pop">
              <button
                type="button"
                role="tab"
                id={conversationTabId(c.id)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={busy ? `${label} — ${t("busy")}` : label}
                aria-keyshortcuts={closable ? "Delete" : undefined}
                title={title}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(c.id, false)}
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-2 focus-visible:ring-indigo-300",
                  selected
                    ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_4px_10px_-4px_rgba(15,23,42,0.22)]"
                    : "text-zinc-400 hover:text-zinc-700 active:scale-90",
                )}
                data-testid="assistant-tab"
                data-busy={busy || undefined}
              >
                <MessageCircle
                  className={cn("h-[17px] w-[17px]", selected && "fill-zinc-900")}
                  strokeWidth={selected ? 2 : 1.7}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute pb-px text-[8.5px] font-bold leading-none tabular-nums",
                    selected ? "text-white" : "text-current",
                  )}
                >
                  {i + 1}
                </span>
                {busy ? (
                  <span aria-hidden className="absolute end-0.5 top-0.5 flex h-[7px] w-[7px]">
                    <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-70 motion-reduce:animate-none" />
                    <span className="relative h-[7px] w-[7px] rounded-full bg-indigo-500 ring-[1.5px] ring-white" />
                  </span>
                ) : null}
              </button>
              {closable && !busy ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onClose(c.id)}
                  aria-label={t("close", { title })}
                  title={t("close", { title })}
                  className={cn(
                    "absolute -end-1 -top-1 flex h-[15px] w-[15px] scale-75 items-center justify-center rounded-full bg-zinc-800 text-white opacity-0 shadow-sm ring-[1.5px] ring-white transition-all duration-200 group-hover:scale-100 group-hover:opacity-100",
                    // Touch screens have no hover: keep the active tab closable.
                    selected && "[@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100",
                  )}
                  data-testid="assistant-tab-close"
                >
                  <X className="h-2 w-2" strokeWidth={3.2} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {canOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("new")}
          title={t("new")}
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/70 hover:text-zinc-800 active:scale-90"
          data-testid="assistant-tab-new"
        >
          <Plus className="h-[15px] w-[15px]" strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
