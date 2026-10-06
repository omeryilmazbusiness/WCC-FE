"use client";

import { useEffect, useState } from "react";
import { CalendarRange, CircleAlert, PlugZap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CHANNEL_LOOK, type InboxChannel } from "@/entities/conversation";
import {
  MAX_RANGE_DAYS,
  RANGE_PRESETS,
  matchPreset,
  presetRange,
  rangeDays,
  type DayRange,
  type RangeIssue,
  type ReportSpec,
} from "@/entities/report";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { IconInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";

const PROVIDER_DEBOUNCE_MS = 400;
const ALL = "__all";
const SLA_CHANNELS: InboxChannel[] = ["whatsapp", "instagram", "facebook", "gmail", "email"];

type Props = {
  spec: ReportSpec;
  range: DayRange;
  today: string;
  issue: RangeIssue;
  channel: string;
  provider: string;
  onRange: (range: DayRange) => void;
  onChannel: (channel: string) => void;
  onProvider: (provider: string) => void;
};

/** Period presets, a custom date range and the report's own extra filter. */
export function ReportFilters({ spec, range, today, issue, channel, provider, onRange, onChannel, onProvider }: Props) {
  const t = useTranslations("reports.filters");
  const locale = useLocale();
  const preset = matchPreset(range, today);

  return (
    <section
      aria-label={t("title")}
      className="rounded-[28px] border border-zinc-200/70 bg-white p-4 shadow-[0_10px_34px_-28px_rgba(15,23,42,0.35)] sm:p-5"
      data-testid="rp-filters"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-zinc-500">{t("period")}</span>
          <div role="group" aria-label={t("period")} className="inline-flex rounded-2xl bg-zinc-100/90 p-1">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={preset === p}
                onClick={() => onRange(presetRange(p, today))}
                data-testid="rp-preset"
                className={cn(
                  "h-9 rounded-xl px-3.5 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  preset === p ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
                )}
              >
                {t(`preset.${p}`)}
              </button>
            ))}
            <span
              className={cn(
                "flex h-9 items-center rounded-xl px-3.5 text-[13px] font-semibold",
                preset === null ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-400",
              )}
              aria-hidden={preset !== null}
            >
              {t("preset.custom")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <DateField id="rp-from" label={t("from")} value={range.from} max={range.to || today} onChange={(from) => onRange({ ...range, from })} />
          <DateField id="rp-to" label={t("to")} value={range.to} min={range.from} max={today} onChange={(to) => onRange({ ...range, to })} />
        </div>

        {spec.extraFilter === "channel" ? (
          <div className="flex flex-col gap-1.5">
            <span id="rp-channel-label" className="text-[12px] font-semibold text-zinc-500">
              {t("channel")}
            </span>
            <Select value={channel || ALL} onValueChange={(v) => onChannel(v === ALL ? "" : v)}>
              <SelectTrigger className="h-11 w-48 rounded-2xl" aria-labelledby="rp-channel-label" data-testid="rp-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allChannels")}</SelectItem>
                {SLA_CHANNELS.map((c) => {
                  const look = CHANNEL_LOOK[c];
                  const Glyph = look.glyph;
                  return (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <Glyph className="h-4 w-4" />
                        {look.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {spec.extraFilter === "provider" ? <ProviderField label={t("provider")} placeholder={t("providerPh")} value={provider} onCommit={onProvider} /> : null}

        {issue === null ? (
          <p className="ms-auto flex h-11 items-center gap-1.5 text-[12.5px] font-medium text-zinc-400" data-testid="rp-days">
            <CalendarRange className="h-4 w-4" aria-hidden />
            {t("days", { count: rangeDays(range), formatted: formatNumber(rangeDays(range), locale) })}
          </p>
        ) : null}
      </div>

      {issue ? (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700" data-testid="rp-range-issue">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {t(`issue.${issue}`, { max: formatNumber(MAX_RANGE_DAYS, locale) })}
        </p>
      ) : null}
    </section>
  );
}

function DateField({ id, label, value, min, max, onChange }: { id: string; label: string; value: string; min?: string; max?: string; onChange: (day: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-zinc-500">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3.5 text-[13.5px] font-medium tabular-nums text-zinc-900 transition-colors focus:border-zinc-300 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        data-testid={id}
      />
    </div>
  );
}

function ProviderField({ label, placeholder, value, onCommit }: { label: string; placeholder: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = window.setTimeout(() => onCommit(draft.trim()), PROVIDER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value, onCommit]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="rp-provider" className="text-[12px] font-semibold text-zinc-500">
        {label}
      </label>
      <IconInput
        id="rp-provider"
        icon={PlugZap}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="h-11 w-48 rounded-2xl"
        data-testid="rp-provider"
      />
    </div>
  );
}
