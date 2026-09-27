"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlaneTakeoff } from "lucide-react";
import { createTaskRepository } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { Button, useToast, useMutationFeedback } from "@/shared/ui";

type Props = {
  bookingId: string;
  label: string;
  customerId: string;
  onDone?: () => void;
};

/** Refresh booking-related ops tasks after confirm (BE seeder owns creation). */
export function ConfirmBookingTasksButton({
  bookingId,
  label,
  customerId,
  onDone,
}: Props) {
  const allowed = useCan("tasks.write");
  const t = useTranslations("tasks");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const tasks = await createTaskRepository().ensureBookingOpsTasks({
        bookingId,
        label,
        assigneeId: "",
        assigneeName: "",
        customerId,
      });
      push({
        title: t("bookingSeededTitle"),
        description: t("bookingSeededBody", { count: tasks.length }),
        tone: "success",
      });
      onDone?.();
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

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
