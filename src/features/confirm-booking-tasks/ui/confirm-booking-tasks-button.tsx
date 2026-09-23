"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlaneTakeoff } from "lucide-react";
import { createTaskRepository } from "@/entities/task";
import { Button, useToast } from "@/shared/ui";

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
  const t = useTranslations("tasks");
  const { push } = useToast();
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
