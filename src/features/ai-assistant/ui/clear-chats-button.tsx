"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

const CONFIRM_MS = 3000;

/** Deletes every chat after a second tap; the confirm state times out on its own. */
export function ClearChatsButton({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  const t = useTranslations("assistant.clear");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  useEffect(() => {
    if (disabled) setConfirming(false);
  }, [disabled]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        setConfirming(false);
        onClear();
      }}
      onBlur={() => setConfirming(false)}
      aria-label={confirming ? t("confirm") : t("label")}
      title={confirming ? t("confirm") : t("label")}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-1 rounded-full text-[12px] font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-35",
        confirming ? "bg-rose-500 px-2.5 text-white shadow-sm hover:bg-rose-600" : "w-8 text-zinc-500 hover:bg-zinc-950/[0.05] hover:text-rose-600",
      )}
      data-testid="assistant-clear"
      data-confirming={confirming}
    >
      <Trash2 className="h-[16px] w-[16px]" aria-hidden />
      {confirming ? <span>{t("confirmShort")}</span> : null}
    </button>
  );
}
