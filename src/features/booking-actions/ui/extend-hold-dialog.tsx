"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TimerReset } from "lucide-react";
import {
  HOLD_DEFAULT_DAYS,
  HOLD_MAX_DAYS,
  holdExpiryError,
  localToRfc3339,
  maxHoldExpiry,
  toDateTimeLocal,
  type Booking,
  type BookingWorkspaceRepository,
} from "@/entities/booking";
import { formatDateTime } from "@/shared/lib/format";
import { Button, Input, useMutationFeedback } from "@/shared/ui";
import { ActionDialog, Field } from "./action-dialog";

const DAY_MS = 86_400_000;

type Props = {
  booking: Booking;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtended: (booking: Booking) => void;
};

/** Suggests the current deadline + the default option window, capped at the maximum. */
function suggestedDeadline(current: string | null): string {
  const base = Math.max(Date.now(), current ? Date.parse(current) : 0);
  const max = Date.now() + HOLD_MAX_DAYS * DAY_MS - 60_000;
  return toDateTimeLocal(new Date(Math.min(base + HOLD_DEFAULT_DAYS * DAY_MS, max)));
}

export function ExtendHoldDialog({ booking, workspace, open, onOpenChange, onExtended }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(suggestedDeadline(booking.holdExpiresAt));
  }, [open, booking.holdExpiresAt]);

  const baseError = holdExpiryError(value);
  const notLater = !baseError && booking.holdExpiresAt && new Date(value).getTime() <= Date.parse(booking.holdExpiresAt);
  const error = baseError ?? (notLater ? "notLater" : null);

  async function submit() {
    setSaving(true);
    try {
      const updated = await workspace.extendHold(booking.id, localToRfc3339(value));
      feedback.success(t("extend.done"));
      onExtended(updated);
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={TimerReset}
      tone="amber"
      title={t("extend.title")}
      description={booking.holdExpiresAt ? t("extend.current", { at: formatDateTime(booking.holdExpiresAt, locale) }) : undefined}
      testId="booking-extend-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || Boolean(error)} onClick={() => void submit()} data-testid="booking-extend-submit">
            {t("extend.submit")}
          </Button>
        </>
      }
    >
      <Field label={t("extend.deadline")} htmlFor="beh-at" hint={error ? t(`extend.error.${error}`) : undefined}>
        <Input
          id="beh-at"
          type="datetime-local"
          value={value}
          max={maxHoldExpiry()}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </Field>
    </ActionDialog>
  );
}
