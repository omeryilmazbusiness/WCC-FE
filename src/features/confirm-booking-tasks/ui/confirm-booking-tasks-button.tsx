"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlaneTakeoff } from "lucide-react";
import { getMemoryTaskRepository } from "@/entities/task";
import { useSessionUser } from "@/shared/api/session-context";
import { Button, useToast } from "@/shared/ui";

type Props = {
  bookingId: string;
  label: string;
  customerId: string;
  onDone?: () => void;
};

/** Demo confirm → seeds document + payment tasks (lead→booking→task E2E). */
export function ConfirmBookingTasksButton({
  bookingId,
  label,
  customerId,
  onDone,
}: Props) {
  const t = useTranslations("tasks");
  const { push } = useToast();
  const user = useSessionUser();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await getMemoryTaskRepository().ensureBookingOpsTasks({
        bookingId,
        label,
        assigneeId: user.id,
        assigneeName: user.fullName,
        customerId,
      });
      push({ title: t("bookingSeededTitle"), description: t("bookingSeededBody"), tone: "success" });
      onDone?.();
    } catch {
      push({ title: t("actionError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={busy}
      onClick={() => void onClick()}
      data-testid="confirm-booking-tasks"
    >
      <PlaneTakeoff className="h-4 w-4" strokeWidth={1.75} />
      {t("confirmBooking")}
    </Button>
  );
}
