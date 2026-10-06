"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown, PlugZap, Search, Target } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CHANNEL_LOOK, type InboxChannel } from "@/entities/conversation";
import {
  SEVERITIES,
  SEVERITY_LOOK,
  currencyRowCode,
  drillKey,
  filterRows,
  nextSort,
  severityCounts,
  severityOf,
  sortRows,
  type ReportRow,
  type ReportSpec,
  type Severity,
  type SortState,
} from "@/entities/report";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatNumber } from "@/shared/lib/format";
import { IconInput, InitialsAvatar, TONES } from "@/shared/ui";
import { MetricCell } from "./metric-value";

type Props = { spec: ReportSpec; rows: ReportRow[]; dimmed?: boolean };

/** Searchable, sortable report rows with severity filter and drill-down links. */
export function ReportTable({ spec, rows, dimmed }: Props) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [sort, setSort] = useState<SortState>(null);

  const counts = useMemo(() => severityCounts(rows), [rows]);
  const visible = useMemo(() => sortRows(filterRows(rows, { query, severity }), sort), [rows, query, severity, sort]);
  const fmt = (n: number) => formatNumber(n, locale);

  return (
    <section
      aria-labelledby="rp-table-title"
      className="rounded-[28px] border border-zinc-200/70 bg-zinc-50/60 p-4 sm:p-5"
      data-testid="rp-table"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rp-table-title" className="text-[16px] font-semibold tracking-tight text-zinc-950">
          {t("table.title")}
          <span className="ms-2 text-[13px] font-medium text-zinc-400">{t("table.count", { shown: fmt(visible.length), total: fmt(rows.length) })}</span>
        </h2>
        <div className="w-full sm:w-72">
          <IconInput
            icon={Search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("table.search")}
            aria-label={t("table.search")}
            className="h-11 rounded-2xl bg-white"
            data-testid="rp-search"
          />
        </div>
      </div>

      <div role="group" aria-label={t("table.severityFilter")} className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SeverityChip active={!severity} onClick={() => setSeverity("")} label={t("severity.all")} count={fmt(counts.all)} />
        {SEVERITIES.filter((s) => counts[s] > 0).map((s) => (
          <SeverityChip
            key={s}
            active={severity === s}
            onClick={() => setSeverity(severity === s ? "" : s)}
            label={t(`severity.${s}`)}
            count={fmt(counts[s])}
            severity={s}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-zinc-500">{t("table.noMatch")}</p>
      ) : (
        <div className={cn("mt-3 overflow-x-auto rounded-[22px] border border-zinc-200/70 bg-white transition-opacity", dimmed && "opacity-60")}>
          <table className="min-w-full text-start text-[13.5px]">
            <thead>
              <tr className="border-b border-zinc-100 text-[11.5px] font-semibold text-zinc-400">
                <SortHeader label={t("table.row")} sortKey="label" sort={sort} onSort={setSort} sticky />
                {spec.columns.map((c) => (
                  <SortHeader key={c.key} label={t(`metrics.${c.key}`)} sortKey={c.key} sort={sort} onSort={setSort} />
                ))}
                <th scope="col" className="relative px-4 py-3 text-start">
                  <span className="sr-only">{t("table.open")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="group border-b border-zinc-100/80 transition-colors last:border-0 hover:bg-zinc-50/80" data-testid="rp-row" data-severity={severityOf(row)}>
                  <th scope="row" className="sticky start-0 z-[1] bg-white px-4 py-3 text-start font-normal transition-colors group-hover:bg-zinc-50">
                    <RowLead spec={spec} row={row} />
                  </th>
                  {spec.columns.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-3 py-3">
                      <MetricCell
                        column={c}
                        value={row.metrics[c.key]}
                        currency={typeof row.metrics.currency === "string" ? row.metrics.currency : null}
                        dashZero={Boolean(c.zeroAsDash) && !currencyRowCode(row)}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {row.drilldowns
                        .filter((d) => d.hrefHint)
                        .map((d, i) => {
                          const key = drillKey(d.hrefHint);
                          return (
                            <Link
                              key={`${d.hrefHint}-${i}`}
                              href={d.hrefHint}
                              className="inline-flex h-8 items-center gap-1 rounded-full bg-zinc-100 px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              data-testid="rp-drill"
                            >
                              {t.has(`drill.${key}`) ? t(`drill.${key}`) : t("table.open")}
                              <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
                            </Link>
                          );
                        })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SortHeader({ label, sortKey, sort, onSort, sticky }: { label: string; sortKey: string; sort: SortState; onSort: (s: SortState) => void; sticky?: boolean }) {
  const active = sort?.key === sortKey ? sort.dir : null;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}
      className={cn("whitespace-nowrap px-3 py-2 text-start", sticky && "sticky start-0 z-[1] bg-white ps-4")}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, sortKey))}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-1 py-1 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          active && "text-zinc-900",
        )}
        data-testid="rp-sort"
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} aria-hidden />
      </button>
    </th>
  );
}

function SeverityChip({ active, onClick, label, count, severity }: { active: boolean; onClick: () => void; label: string; count: string; severity?: Severity }) {
  const look = severity ? SEVERITY_LOOK[severity] : null;
  const Icon = look?.icon;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-full pe-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        Icon ? "ps-1.5" : "ps-3.5",
        active ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-700 ring-1 ring-inset ring-zinc-900/[0.06] hover:bg-zinc-100",
      )}
      data-testid="rp-severity"
    >
      {Icon && look ? (
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", TONES[look.tone].solid)} aria-hidden>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      ) : null}
      {label}
      <span className={cn("rounded-full px-1.5 text-[11.5px] tabular-nums", active ? "bg-white/20" : "bg-zinc-100 text-zinc-500")}>{count}</span>
    </button>
  );
}

/** Leading identity of a row — person, channel, currency, target or provider. */
function RowLead({ spec, row }: { spec: ReportSpec; row: ReportRow }) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const sev = SEVERITY_LOOK[severityOf(row)];
  const code = spec.kind === "finance" ? currencyRowCode(row) : null;
  const m = row.metrics;

  let visual: React.ReactNode;
  let title = row.label;
  let caption: string | null = null;

  if (code) {
    visual = <Badge tone="teal">{code}</Badge>;
    title = t("currencyRow", { code });
  } else if (spec.kind === "sla") {
    const look = CHANNEL_LOOK[row.id as InboxChannel];
    const Glyph = look?.glyph;
    visual = Glyph ? (
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[look.tone].solid)} aria-hidden>
        <Glyph className="h-[18px] w-[18px]" />
      </span>
    ) : (
      <Badge tone="zinc">{row.label.slice(0, 2).toUpperCase()}</Badge>
    );
    title = look?.name ?? row.label;
  } else if (spec.kind === "targets") {
    visual = (
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES.violet.soft)} aria-hidden>
        <Target className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
    );
    if (typeof m.period_start === "string" && typeof m.period_end === "string") caption = `${formatDay(m.period_start, locale)} – ${formatDay(m.period_end, locale)}`;
  } else if (spec.kind === "integrations") {
    const provider = typeof m.provider === "string" ? m.provider : "";
    const look = CHANNEL_LOOK[provider as InboxChannel];
    const Glyph = look?.glyph;
    visual = (
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", look ? TONES[look.tone].soft : TONES.indigo.soft)} aria-hidden>
        {Glyph ? <Glyph className="h-[18px] w-[18px]" /> : <PlugZap className="h-[18px] w-[18px]" strokeWidth={2.2} />}
      </span>
    );
    title = typeof m.summary === "string" && m.summary ? m.summary : row.label;
    caption = look?.name ?? provider;
  } else {
    visual = <InitialsAvatar id={row.id} name={row.label} size="md" />;
  }

  return (
    <span className="flex min-w-[200px] max-w-[320px] items-center gap-3">
      <span className="relative shrink-0">
        {visual}
        <span
          className={cn("absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full ring-2 ring-white", TONES[sev.tone].dot)}
          title={t(`severity.${severityOf(row)}`)}
          aria-label={t(`severity.${severityOf(row)}`)}
          role="img"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-zinc-950" title={title}>
          {title}
        </span>
        {caption ? <span className="block truncate text-[12px] text-zinc-500">{caption}</span> : null}
      </span>
    </span>
  );
}

function Badge({ tone, children }: { tone: "teal" | "zinc"; children: React.ReactNode }) {
  return (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold tracking-wide", TONES[tone].gradient)} aria-hidden>
      {children}
    </span>
  );
}
