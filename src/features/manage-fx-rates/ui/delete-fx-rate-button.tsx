"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { FxRate, FxRepository } from "@/entities/fx";
import { useCan } from "@/entities/viewer";
import { Button, ConfirmDialog, useMutationFeedback } from "@/shared/ui";

type Props = {
  rate: FxRate;
  repository: FxRepository;
  onDeleted: () => void;
};

export function DeleteFxRateButton({ rate, repository, onDeleted }: Props) {
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
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={t("delete")}
        onClick={() => setOpen(true)}
        data-testid="fx-rate-delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
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
