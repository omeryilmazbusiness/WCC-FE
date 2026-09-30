"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange, X } from "lucide-react";
import {
  RANGE_SHORTCUTS,
  daysInclusive,
  shortcutRange,
  toISODay,
  trailingRange,
  validateRange,
  type DashboardPeriod,
} from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, TONES } from "@/shared/ui";

type Props = {
  value: DashboardPeriod;
  locale: string;
  onApply: (next: DashboardPeriod) => void;
};

type Draft = { from: string; to: string };

function formatRange(from: string, to: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return fmt.formatRange(new Date(fy, fm - 1, fd), new Date(ty, tm - 1, td));
}

function initialDraft(value: DashboardPeriod): Draft {
  return value.kind === "custom" ? { from: value.from, to: value.to } : trailingRange(value.days, new Date());
}

/** Calendar trigger beside the presets; shows the chosen window once a custom range is active. */
export function CustomRangePopover({ value, locale, onApply }: Props) {
  const t = useTranslations("manager.periodPicker");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(value));
  const active = value.kind === "custom";

  const now = new Date();
  const today = toISODay(now);
  const error = validateRange(draft.from, draft.to, now);
  const days = error ? 0 : daysInclusive(draft.from, draft.to);

  const onOpenChange = (next: boolean) => {
    if (next) setDraft(initialDraft(value));
    setOpen(next);
  };

  const apply = () => {
    if (error) return;
    onApply({ kind: "custom", from: draft.from, to: draft.to });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={active ? t("editLabel", { range: formatRange(value.from, value.to, locale) }) : t("open")}
        title={t("open")}
        data-testid="period-custom"
        data-active={active || undefined}
        className={cn(
          "inline-flex h-[42px] items-center gap-2 rounded-2xl border shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10",
          active
            ? "border-indigo-200/80 bg-indigo-50/80 pe-3.5 ps-1.5 text-indigo-900 hover:bg-indigo-50"
            : "w-[42px] justify-center border-zinc-200/80 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900",
          open && !active && "border-zinc-300 text-zinc-900",
        )}
      >
        {active ? (
          <>
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", TONES.indigo.gradient)}>
              <CalendarRange className="h-4 w-4" strokeWidth={2.1} />
            </span>
            <span className="text-xs font-semibold tabular-nums" data-testid="period-custom-label">
              {formatRange(value.from, value.to, locale)}
            </span>
          </>
        ) : (
          <CalendarRange className="h-[18px] w-[18px]" strokeWidth={2} />
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] max-w-[calc(100vw-2rem)] p-4" data-testid="period-custom-panel">
        <div className="flex items-start gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.indigo.gradient)}>
            <CalendarRange className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight text-zinc-900">{t("title")}</p>
            <p className="text-[12px] font-medium text-zinc-500">{t("hint")}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {RANGE_SHORTCUTS.map((s) => {
            const r = shortcutRange(s, now);
            const selected = r.from === draft.from && r.to === draft.to;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setDraft(r)}
                aria-pressed={selected}
                data-testid={`period-shortcut-${s}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  selected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900",
                )}
              >
                {t(`shortcuts.${s}`)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-from`} className="text-[12px] text-zinc-500">
              {t("from")}
            </Label>
            <Input
              id={`${id}-from`}
              type="date"
              max={draft.to || today}
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="h-10 px-3 text-[13px]"
              data-testid="period-from"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-to`} className="text-[12px] text-zinc-500">
              {t("to")}
            </Label>
            <Input
              id={`${id}-to`}
              type="date"
              min={draft.from || undefined}
              max={today}
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="h-10 px-3 text-[13px]"
              data-testid="period-to"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p
            role={error ? "alert" : undefined}
            className={cn("min-w-0 text-[12px] font-medium", error ? "text-rose-600" : "text-zinc-500")}
            data-testid="period-summary"
          >
            {error ? t(`errors.${error}`) : t("days", { count: days })}
          </p>
          <Button size="sm" onClick={apply} disabled={Boolean(error)} data-testid="period-apply">
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
