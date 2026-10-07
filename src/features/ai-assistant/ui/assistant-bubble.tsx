"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { useAssistant } from "../model/assistant-context";
import { AssistantOrb } from "./assistant-orb";
import { ASSISTANT_PANEL_ID } from "./assistant-panel";

/** Floating chat bubble pinned to the bottom corner of every shell screen; hides while the panel is open. */
export function AssistantBubble({ className }: { className?: string }) {
  const t = useTranslations("assistant");
  const { enabled, open, setOpen } = useAssistant();
  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("open")}
      aria-controls={ASSISTANT_PANEL_ID}
      aria-expanded={open}
      className={cn(
        "group fixed bottom-4 end-4 z-30 flex items-center gap-2.5 rounded-full bg-white/90 p-1.5 sm:bottom-6 sm:end-6 sm:pe-4 shadow-[0_18px_40px_-14px_rgba(79,70,229,0.55),0_0_0_1px_rgba(15,23,42,0.06)] backdrop-blur-xl",
        "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-14px_rgba(79,70,229,0.65),0_0_0_1px_rgba(15,23,42,0.06)] active:scale-95",
        open && "pointer-events-none translate-y-4 scale-90 opacity-0",
        className,
      )}
      data-testid="assistant-bubble"
    >
      <AssistantOrb size="md" />
      <span className="hidden text-[14px] font-semibold tracking-tight text-zinc-900 sm:inline">{t("ask")}</span>
    </button>
  );
}
