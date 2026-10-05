"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Package } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import { samePick, type PackagePick } from "../model/pick";
import { PackagePicker } from "./package-picker";

type Props = {
  value: PackagePick;
  /** Persists the new link; the dialog closes when it resolves. */
  onSave: (next: PackagePick) => Promise<void>;
  withDeparture?: boolean;
  title?: string;
  description?: string;
  trigger: ReactNode;
};

/** Set, change or clear the package a record is about. */
export function LinkPackageDialog({ value, onSave, withDeparture = true, title, description, trigger }: Props) {
  const t = useTranslations("packageLink");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PackagePick>(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      feedback.success(draft.packageId ? t("saved") : t("unlinked"));
      setOpen(false);
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto" data-testid="link-package-dialog">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.amber.gradient)} aria-hidden>
              <Package className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <DialogTitle>{title ?? t("linkTitle")}</DialogTitle>
              <DialogDescription>{description ?? t("linkHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <PackagePicker value={draft} onChange={setDraft} withDeparture={withDeparture} testId="link-package-picker" />
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || samePick(draft, value)} data-testid="link-package-save">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
