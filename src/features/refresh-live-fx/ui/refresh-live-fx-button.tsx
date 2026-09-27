"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { createFxLiveRepository, type FxLiveBoard } from "@/entities/fx-live";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { IconButton, useMutationFeedback } from "@/shared/ui";

const repo = createFxLiveRepository();

type Props = {
  onRefreshed: (board: FxLiveBoard) => void;
  className?: string;
};

/** Forces the backend to re-fetch live sources (`fx.manage`); renders nothing otherwise. */
export function RefreshLiveFxButton({ onRefreshed, className }: Props) {
  const t = useTranslations("fxLive");
  const canManage = useCan("fx.manage");
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  if (!canManage) return null;

  async function refresh() {
    setBusy(true);
    try {
      onRefreshed(await repo.refresh());
    } catch (err) {
      feedback.error(err, t("refreshError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <IconButton
      label={t("refresh")}
      variant="ghost"
      disabled={busy}
      aria-busy={busy}
      onClick={() => void refresh()}
      className={cn("h-8 w-8 shrink-0 text-zinc-500 hover:text-zinc-950", className)}
      data-testid="fx-live-refresh"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={1.75} />
    </IconButton>
  );
}
