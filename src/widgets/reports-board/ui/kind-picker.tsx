"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { REPORT_KIND_LOOK, REPORT_KINDS, REPORT_SPECS, type ReportKind } from "@/entities/report";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = { value: ReportKind; onChange: (kind: ReportKind) => void };

/** Big-icon report switcher; one card per report, sensitive ones marked as audited. */
export function KindPicker({ value, onChange }: Props) {
  const t = useTranslations("reports");

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const i = REPORT_KINDS.indexOf(value);
    const next = REPORT_KINDS[(i + (forward ? 1 : -1) + REPORT_KINDS.length) % REPORT_KINDS.length];
    onChange(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("pickReport")}
      onKeyDown={onKeyDown}
      className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6"
      data-testid="rp-kinds"
    >
      {REPORT_KINDS.map((kind) => {
        const look = REPORT_KIND_LOOK[kind];
        const Icon = look.icon;
        const active = kind === value;
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(kind)}
            data-kind={kind}
            data-testid="rp-kind"
            className={cn(
              "group relative flex min-h-[132px] flex-col items-start gap-3 rounded-[24px] border bg-gradient-to-br p-4 text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              active
                ? cn("border-transparent shadow-[0_18px_40px_-24px_rgba(15,23,42,0.5)] ring-2 ring-zinc-900/80", TONES[look.tone].tint)
                : "border-zinc-200/70 from-white to-white hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)]",
            )}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
                  active ? TONES[look.tone].gradient : TONES[look.tone].soft,
                )}
                aria-hidden
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </span>
              {REPORT_SPECS[kind].sensitive ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                  title={t("audited")}
                  aria-label={t("audited")}
                >
                  <LockKeyhole className="h-3 w-3" strokeWidth={2.4} />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold tracking-tight text-zinc-950">{t(`kinds.${kind}`)}</span>
              <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-zinc-500">{t(`kindHint.${kind}`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
