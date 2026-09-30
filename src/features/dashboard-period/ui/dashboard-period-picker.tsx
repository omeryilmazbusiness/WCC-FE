"use client";

import { useTranslations } from "next-intl";
import { PERIOD_PRESETS, type DashboardPeriod } from "@/entities/dashboard";
import { SegmentedControl } from "@/shared/ui";
import { CustomRangePopover } from "./custom-range-popover";

type Props = {
  value: DashboardPeriod;
  onChange: (next: DashboardPeriod) => void;
  locale: string;
};

const CUSTOM = "custom";

/** Rolling presets plus a custom calendar window; no preset is highlighted while a custom range is active. */
export function DashboardPeriodPicker({ value, onChange, locale }: Props) {
  const t = useTranslations("manager");
  const selected = value.kind === "preset" ? String(value.days) : CUSTOM;

  return (
    <div className="flex items-center gap-2" data-testid="period-picker">
      <SegmentedControl<string>
        value={selected}
        onChange={(v) => {
          const days = PERIOD_PRESETS.find((d) => String(d) === v);
          if (days) onChange({ kind: "preset", days });
        }}
        aria-label={t("period")}
        options={PERIOD_PRESETS.map((d) => ({ value: String(d), label: t(`periodShort.d${d}`) }))}
      />
      <CustomRangePopover value={value} locale={locale} onApply={onChange} />
    </div>
  );
}
