"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { useAssistant } from "../model/assistant-context";
import { ASSISTANT_PANEL_ID } from "./assistant-panel";

/** Header toggle for the assistant panel. */
export function AssistantHeaderButton() {
  const t = useTranslations("assistant");
  const { enabled, open, toggle } = useAssistant();
  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? t("close") : t("open")}
      title={t("title")}
      aria-controls={ASSISTANT_PANEL_ID}
      aria-expanded={open}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full transition",
        open
          ? "bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 text-white shadow-[0_6px_16px_-8px_rgba(99,102,241,0.9)]"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600",
      )}
      data-testid="assistant-header-button"
    >
      <Sparkles className="h-[17px] w-[17px]" strokeWidth={2.1} />
    </button>
  );
}
