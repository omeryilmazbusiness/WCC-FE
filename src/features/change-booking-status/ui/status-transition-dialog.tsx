"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  HOLD_MAX_DAYS,
  defaultHoldExpiry,
  holdExpiryError,
  localToRfc3339,
  maxHoldExpiry,
  toDateTimeLocal,
  type AllowedTransition,
  type Booking,
  type BookingRepository,
} from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import {
  STATUS_REASON_MIN,
  classifyStatusError,
  isStatusReasonValid,
  reasonRequired,
} from "../model/transition";
import { GuardList } from "./guard-list";

type Props = {
  booking: Booking;
  transition: AllowedTransition;
  repository: BookingRepository;
  /** Guards reported by an earlier failed attempt at this transition. */
  knownGuards: string[];
  onGuards: (guards: string[]) => void;
  onOpenChange: (open: boolean) => void;
  onChanged: (booking: Booking | null) => void;
};

type Mode = "override" | "hold" | "reason" | "confirm";

export function StatusTransitionDialog({
  booking,
  transition,
  repository,
  knownGuards,
  onGuards,
  onOpenChange,
  onChanged,
}: Props) {
  const t = useTranslations("bookingStatus");
  const tStatus = useTranslations("bookings.status");
  const feedback = useMutationFeedback();
  const canOverride = useCan("bookings.override");
  const [reason, setReason] = useState("");
  const [holdAt, setHoldAt] = useState(() => defaultHoldExpiry());
  const [override, setOverride] = useState(transition.requiresOverride);
  const [guards, setGuards] = useState<string[]>(knownGuards);
  const [failedGuards, setFailedGuards] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = tStatus(transition.status);
  const isHold = transition.status === "option_hold";
  const needsReason = reasonRequired(transition, override);
  const holdError = isHold ? holdExpiryError(holdAt) : null;
  const reasonOk = !needsReason || isStatusReasonValid(reason);
  const overrideBlocked = override && !canOverride;
  const ready = reasonOk && !holdError && !overrideBlocked && !busy;

  const mode: Mode = override ? "override" : isHold ? "hold" : needsReason ? "reason" : "confirm";

  function change(next: boolean) {
    if (!busy) onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      const updated = await repository.changeStatus(booking.id, {
        status: transition.status,
        reason: reason.trim() || undefined,
        holdExpiresAt: isHold ? localToRfc3339(holdAt) : undefined,
        override: override || undefined,
      });
      feedback.success(t("changed", { status }));
      setBusy(false);
      onOpenChange(false);
      onChanged(updated);
    } catch (err) {
      setBusy(false);
      const failure = classifyStatusError(err);
      if (failure.kind === "guardFailed") {
        setGuards(failure.guards);
        setFailedGuards(true);
        onGuards(failure.guards);
      } else if (failure.kind === "invalidTransition") {
        feedback.error(err, t("invalidTransition"));
        onOpenChange(false);
        onChanged(null);
      } else {
        feedback.error(err, t("changeError"));
      }
    }
  }

  return (
    <Dialog open onOpenChange={change}>
      <DialogContent className="sm:max-w-lg" data-testid="status-transition-dialog">
        <DialogHeader>
          <DialogTitle>{t(`dialog.${mode}Title`, { status })}</DialogTitle>
          <DialogDescription>{t(`dialog.${mode}Description`, { status })}</DialogDescription>
        </DialogHeader>

        {failedGuards && !override ? (
          <div
            role="alert"
            data-testid="status-guard-failed"
            className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
              {t("guardFailed")}
            </p>
            <GuardList guards={guards} />
            {canOverride ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOverride(true)}
                data-testid="status-use-override"
              >
                {t("useOverride")}
              </Button>
            ) : (
              <p className="text-xs">{t("overrideManagerOnly")}</p>
            )}
          </div>
        ) : null}

        {override ? (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert aria-hidden className="h-4 w-4 shrink-0" />
              {guards.length ? t("overrideBypasses") : t("overrideNoGuards")}
            </p>
            {guards.length ? <GuardList guards={guards} /> : null}
            {overrideBlocked ? <p className="text-xs">{t("overrideManagerOnly")}</p> : null}
          </div>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {isHold ? (
            <div className="space-y-1.5">
              <Label htmlFor="hold-expires-at">{t("holdExpiresAt")}</Label>
              <Input
                id="hold-expires-at"
                type="datetime-local"
                value={holdAt}
                min={toDateTimeLocal(new Date())}
                max={maxHoldExpiry()}
                onChange={(e) => setHoldAt(e.target.value)}
                disabled={busy}
                required
                dir="ltr"
                data-testid="hold-expires-at"
              />
              <p className={holdError ? "text-xs text-red-600" : "text-xs text-zinc-500"}>
                {holdError ? t(`holdError.${holdError}`, { days: HOLD_MAX_DAYS }) : t("holdHint", { days: HOLD_MAX_DAYS })}
              </p>
            </div>
          ) : null}

          {needsReason || mode === "confirm" ? (
            <div className="space-y-1.5">
              <Label htmlFor="status-reason">
                {needsReason ? t("reasonLabel") : t("reasonOptionalLabel")}
              </Label>
              <Textarea
                id="status-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                disabled={busy}
                required={needsReason}
                minLength={needsReason ? STATUS_REASON_MIN : undefined}
                data-testid="status-reason"
              />
              {needsReason ? (
                <p className={reason && !reasonOk ? "text-xs text-red-600" : "text-xs text-zinc-500"}>
                  {t("reasonHint", { min: STATUS_REASON_MIN })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant={transition.status === "cancelled" ? "destructive" : "default"}
              disabled={!ready}
              data-testid="status-submit"
            >
              {override ? t("submitOverride", { status }) : t("submit", { status })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
