"use client";

import { LayoutGrid, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ROLE_LOOK, STATUS_LOOK, type MemberFilter, type MemberStatus, type StatusFilter, type TeamSummary } from "@/entities/identity";
import type { AppRole } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { IconInput, SegmentedControl, TONES } from "@/shared/ui";

const STATUSES: readonly MemberStatus[] = ["active", "locked", "inactive"];

type Props = {
  filter: MemberFilter;
  onChange: (next: MemberFilter) => void;
  summary: TeamSummary;
  /** Roles present in the list, in display order; hidden when there is only one. */
  roles: readonly AppRole[];
};

/** Search, status switcher and colourful role chips with live counts. */
export function TeamToolbar({ filter, onChange, summary, roles }: Props) {
  const t = useTranslations("team");
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale);
  const set = (patch: Partial<MemberFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <IconInput
          icon={Search}
          type="search"
          value={filter.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={t("filters.search")}
          aria-label={t("filters.search")}
          className="md:max-w-sm"
          data-testid="team-search"
        />
        <SegmentedControl<StatusFilter>
          value={filter.status}
          onChange={(status) => set({ status })}
          aria-label={t("filters.status")}
          className="overflow-x-auto"
          options={[
            { value: "all", label: t("filters.allStatus"), icon: LayoutGrid },
            ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`), count: n(summary.byStatus[s]), icon: STATUS_LOOK[s].icon })),
          ]}
        />
      </div>
      {roles.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters.role")}>
          <Chip active={filter.role === "all"} onClick={() => set({ role: "all" })} label={t("filters.allRoles")} count={n(summary.total)} />
          {roles.map((r) => {
            const look = ROLE_LOOK[r];
            return (
              <Chip
                key={r}
                active={filter.role === r}
                onClick={() => set({ role: filter.role === r ? "all" : r })}
                label={t(`roles.${r}`)}
                count={n(summary.byRole[r] ?? 0)}
                icon={look.icon}
                tone={look.tone}
                testId={`team-role-${r}`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type ChipProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  count: string;
  icon?: typeof Search;
  tone?: keyof typeof TONES;
  testId?: string;
};

function Chip({ active, onClick, label, count, icon: Icon, tone = "zinc", testId }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border ps-1.5 pe-3.5 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active ? "border-transparent bg-zinc-900 text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
        !Icon && "ps-3.5",
      )}
    >
      {Icon ? (
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", active ? "bg-white/15 text-white" : TONES[tone].soft)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      {label}
      <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-white/15" : "bg-zinc-100 text-zinc-500")}>{count}</span>
    </button>
  );
}
