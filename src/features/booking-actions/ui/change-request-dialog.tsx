"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarSync, Repeat2, Route, UserPen, FileQuestion } from "lucide-react";
import { CHANGE_KINDS, type BookingChangeRequest, type BookingWorkspaceRepository, type ChangeKind } from "@/entities/booking";
import { Button, Textarea, useMutationFeedback, type Tone } from "@/shared/ui";
import { ActionDialog, ChoiceCard, Field } from "./action-dialog";

const KIND_LOOK: Record<ChangeKind, { icon: typeof Route; tone: Tone }> = {
  date_change: { icon: CalendarSync, tone: "sky" },
  name_change: { icon: UserPen, tone: "violet" },
  route_change: { icon: Route, tone: "amber" },
  other: { icon: FileQuestion, tone: "zinc" },
};

type Props = {
  bookingId: string;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequested: (change: BookingChangeRequest) => void;
};

export function ChangeRequestDialog({ bookingId, workspace, open, onOpenChange, onRequested }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [kind, setKind] = useState<ChangeKind>("date_change");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("date_change");
    setDetails("");
  }, [open]);

  async function submit() {
    setSaving(true);
    try {
      const cr = await workspace.requestChange(bookingId, kind, details.trim());
      feedback.success(t("changeDialog.done"));
      onRequested(cr);
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
      icon={Repeat2}
      tone="indigo"
      title={t("changeDialog.title")}
      testId="booking-change-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || !details.trim()} onClick={() => void submit()} data-testid="booking-change-submit">
            {t("changeDialog.submit")}
          </Button>
        </>
      }
    >
      <Field label={t("changeDialog.kind")}>
        <div className="grid grid-cols-2 gap-2">
          {CHANGE_KINDS.map((k) => (
            <ChoiceCard
              key={k}
              selected={kind === k}
              onSelect={() => setKind(k)}
              icon={KIND_LOOK[k].icon}
              tone={KIND_LOOK[k].tone}
              label={t(`change.kind.${k}`)}
            />
          ))}
        </div>
      </Field>
      <Field label={t("changeDialog.details")} htmlFor="bcr-details">
        <Textarea
          id="bcr-details"
          rows={4}
          maxLength={2000}
          value={details}
          placeholder={t("changeDialog.detailsPlaceholder")}
          onChange={(e) => setDetails(e.target.value)}
        />
      </Field>
    </ActionDialog>
  );
}
