"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { FxRate, FxRepository } from "@/entities/fx";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { ConfirmDialog, IconButton, useMutationFeedback } from "@/shared/ui";

type Props = {
  rate: FxRate;
  repository: FxRepository;
  onDeleted: () => void;
  className?: string;
};

export function DeleteFxRateButton({ rate, repository, onDeleted, className }: Props) {
  const t = useTranslations("fx");
  const allowed = useCan("fx.manage");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  async function confirm() {
    setBusy(true);
    try {
      await repository.remove(rate.id);
      feedback.success(t("deleted"));
      setOpen(false);
      onDeleted();
    } catch (err) {
      feedback.error(err, t("deleteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconButton
        type="button"
        variant="ghost"
        label={t("delete")}
        title={t("delete")}
        onClick={() => setOpen(true)}
        className={cn("h-9 w-9 rounded-full text-zinc-400 hover:bg-rose-50 hover:text-rose-600", className)}
        data-testid="fx-rate-delete"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </IconButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("deleteTitle", { pair: `${rate.base}/${rate.quote}`, date: rate.effectiveDate })}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void confirm()}
        pending={busy}
        destructive
      />
    </>
  );
}
