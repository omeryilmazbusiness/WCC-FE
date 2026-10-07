"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SUPPORT_LIMITS, SUPPORT_STATUSES, supportApi, type InboundRequest, type SupportStatus } from "@/entities/support";
import { Button, SegmentedControl, useMutationFeedback } from "@/shared/ui";

/** Status and the reply the requester sees; saves both in one call. */
export function SupportRequestEditor({
  request,
  onSaved,
}: {
  request: InboundRequest;
  onSaved: (next: InboundRequest) => void;
}) {
  const t = useTranslations("support.editor");
  const tStatus = useTranslations("support.status");
  const feedback = useMutationFeedback();
  const [status, setStatus] = useState<SupportStatus>(request.status);
  const [note, setNote] = useState(request.adminNote);
  const [saving, setSaving] = useState(false);
  const dirty = status !== request.status || note.trim() !== request.adminNote;
  const tooLong = [...note.trim()].length > SUPPORT_LIMITS.noteMax;

  async function save() {
    if (!dirty || tooLong || saving) return;
    setSaving(true);
    try {
      const saved = await supportApi.update(request.id, status, note);
      onSaved({ ...request, ...saved });
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="support-editor">
      <SegmentedControl<SupportStatus>
        value={status}
        onChange={setStatus}
        aria-label={t("status")}
        options={SUPPORT_STATUSES.map((s) => ({ value: s, label: tStatus(s) }))}
      />
      <div>
        <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor={`note-${request.id}`}>
          {t("note")}
        </label>
        <textarea
          id={`note-${request.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={SUPPORT_LIMITS.noteMax + 100}
          placeholder={t("notePlaceholder")}
          className="block w-full resize-y rounded-2xl bg-zinc-50 px-3 py-2 text-[14px] leading-relaxed text-zinc-950 ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
          data-testid="support-note"
        />
        <p className="mt-1 flex justify-between text-[12px] text-zinc-500">
          <span className={tooLong ? "text-rose-600" : undefined}>{tooLong ? t("noteTooLong") : t("noteHint")}</span>
          <span className="tabular-nums" dir="ltr">
            {[...note.trim()].length}/{SUPPORT_LIMITS.noteMax}
          </span>
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={!dirty || tooLong || saving} className="h-9 rounded-full px-4" data-testid="support-save">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
