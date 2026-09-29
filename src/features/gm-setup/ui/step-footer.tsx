"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PillButton } from "./glass";

type Props = {
  onBack: (() => void) | null;
  primaryLabel: string;
  onPrimary: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Optional quiet action under the buttons, e.g. "Skip for now". */
  secondary?: { label: string; onClick: () => void };
};

/** Back / primary pair with equal widths so every step ends the same way. */
export function StepFooter({ onBack, primaryLabel, onPrimary, busy, disabled, secondary }: Props) {
  const t = useTranslations("setup.actions");
  return (
    <div className="space-y-2 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <PillButton
          variant="glass"
          onClick={onBack ?? undefined}
          disabled={!onBack || busy}
          data-testid="setup-back"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={2.25} />
          {t("back")}
        </PillButton>
        <PillButton onClick={onPrimary} disabled={disabled || busy} data-testid="setup-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {primaryLabel}
          {busy ? null : <ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2.25} />}
        </PillButton>
      </div>
      <div className="flex h-9 justify-center">
        {secondary ? (
          <PillButton variant="plain" onClick={secondary.onClick} disabled={busy} data-testid="setup-skip">
            {secondary.label}
          </PillButton>
        ) : null}
      </div>
    </div>
  );
}
