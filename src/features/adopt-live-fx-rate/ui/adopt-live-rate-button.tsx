"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookPlus, Check, Loader2 } from "lucide-react";
import { createFxRepository } from "@/entities/fx";
import type { FxLiveKind } from "@/entities/fx-live";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { IconButton, useMutationFeedback, useToast } from "@/shared/ui";
import { classifyAdoptError } from "../model/adopt";

const repo = createFxRepository();
const CONFIRM_WINDOW_MS = 4000;

type Props = {
  currency: string;
  kind: FxLiveKind;
  /** No usable live quote for this kind. */
  disabled?: boolean;
};

/** Saves the live mid as today's accounting rate (`fx.manage`); first click arms, second confirms. */
export function AdoptLiveRateButton({ currency, kind, disabled }: Props) {
  const t = useTranslations("fxLive");
  const canManage = useCan("fx.manage");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [armed]);

  if (!canManage) return null;

  const kindLabel = t(`kindShort.${kind}`);
  const values = { currency, kind: kindLabel };

  async function adopt() {
    setArmed(false);
    setBusy(true);
    try {
      await repo.adoptLive({ currency, kind, side: "mid" });
      feedback.success(t("adopted", values));
    } catch (err) {
      const failure = classifyAdoptError(err);
      if (failure === "exists") push({ title: t("adoptExists", values), tone: "info" });
      else if (failure === "unavailable") push({ title: t("adoptUnavailable", values), tone: "error" });
      else feedback.error(err, t("adoptError"));
    } finally {
      setBusy(false);
    }
  }

  const label = armed ? t("adoptConfirm", values) : t("adoptLabel", values);

  return (
    <IconButton
      label={label}
      title={label}
      variant="ghost"
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={() => (armed ? void adopt() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={cn(
        "h-7 w-7 rounded-lg",
        armed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-zinc-400 hover:text-zinc-950",
      )}
      data-testid={`fx-live-adopt-${currency}`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : armed ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <BookPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
      )}
    </IconButton>
  );
}
