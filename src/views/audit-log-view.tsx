"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  KeyRound,
  MapPin,
  Plane,
  UserRound,
  Users,
} from "lucide-react";
import {
  AUDIT_PAGE_SIZE,
  AuditEventDetails,
  createAuditRepository,
  startOfDayRfc3339,
  type AuditEvent,
  type AuditFilters,
} from "@/entities/audit";
import { listUsers } from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  PageHeader,
  QueryState,
  Screen,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMutationFeedback,
} from "@/shared/ui";

const repo = createAuditRepository();
const ALL = "all";

type Period = "all" | "today" | "week" | "month";
const PERIOD_DAYS: Record<Exclude<Period, "all">, number> = { today: 0, week: 6, month: 29 };

const orUndefined = (value: string) => (value === ALL || !value ? undefined : value);

function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function periodStart(period: Period): string | undefined {
  if (period === "all") return undefined;
  const d = new Date();
  d.setDate(d.getDate() - PERIOD_DAYS[period]);
  return startOfDayRfc3339(localDay(d));
}

type Look = { icon: LucideIcon; tint: string };

const LOOKS: Record<string, Look> = {
  auth: { icon: KeyRound, tint: "bg-indigo-50 text-indigo-500" },
  user: { icon: UserRound, tint: "bg-sky-50 text-sky-500" },
  company: { icon: Building2, tint: "bg-violet-50 text-violet-500" },
  company_setup: { icon: Building2, tint: "bg-violet-50 text-violet-500" },
  setup: { icon: Building2, tint: "bg-violet-50 text-violet-500" },
  branch: { icon: MapPin, tint: "bg-teal-50 text-teal-500" },
  customer: { icon: Users, tint: "bg-amber-50 text-amber-500" },
  booking: { icon: Plane, tint: "bg-cyan-50 text-cyan-500" },
  payment: { icon: CreditCard, tint: "bg-emerald-50 text-emerald-500" },
};
const DEFAULT_LOOK: Look = { icon: Activity, tint: "bg-zinc-100 text-zinc-500" };

function lookOf(event: AuditEvent): Look {
  return LOOKS[event.action.split(".")[0]] ?? LOOKS[event.entity_type] ?? DEFAULT_LOOK;
}

/** "auth.login_succeeded" → "Auth login succeeded". */
function humanizeAction(action: string): string {
  const text = action.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function dayLabel(day: string, locale: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0 || diff === -1) {
    return capitalize(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diff, "day"));
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(y !== today.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function AuditLogView() {
  const t = useTranslations("audit");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canReadUsers = useCan("users.read");

  const [period, setPeriod] = useState<Period>("all");
  const [entityType, setEntityType] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [actorId, setActorId] = useState(ALL);
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo<AuditFilters>(
    () => ({
      entityType: orUndefined(entityType),
      action: orUndefined(action),
      actorId: orUndefined(actorId),
      from: periodStart(period),
    }),
    [entityType, action, actorId, period],
  );

  const events = useApiQuery(() => repo.list(filters, { limit: AUDIT_PAGE_SIZE, offset }), [filters, offset]);
  const actions = useApiQuery(() => repo.listActions(), []);
  const users = useApiQuery(() => listUsers(), [], { enabled: canReadUsers });

  const entityTypes = useMemo(() => {
    const fromActions = (actions.data ?? []).map((a) => a.split(".")[0]).filter(Boolean);
    return [...new Set<string>(fromActions)].sort();
  }, [actions.data]);

  const page = events.data;
  const rows = useMemo(() => page?.items ?? [], [page]);
  const isFiltered = Object.values(filters).some(Boolean);

  const groups = useMemo(() => {
    const out: { day: string; items: AuditEvent[] }[] = [];
    for (const event of rows) {
      const day = localDay(new Date(event.created_at));
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(event);
      else out.push({ day, items: [event] });
    }
    return out;
  }, [rows]);

  const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);

  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setOffset(0);
    };
  }

  function resetFilters() {
    setPeriod("all");
    setEntityType(ALL);
    setAction(ALL);
    setActorId(ALL);
    setOffset(0);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const { blob, filename } = await repo.exportCsv(filters);
      saveBlob(blob, filename);
      feedback.success(t("exported"));
    } catch (err) {
      feedback.error(err, t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen data-testid="audit-log">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <button
            type="button"
            disabled={exporting}
            onClick={() => void exportCsv()}
            data-testid="audit-export-csv"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-zinc-100 px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-200/80 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            {t("exportCsv")}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<Period>
          aria-label={t("periodLabel")}
          value={period}
          onChange={withPageReset(setPeriod)}
          options={(["all", "today", "week", "month"] as const).map((p) => ({ value: p, label: t(`period.${p}`) }))}
          className="rounded-full border-0 bg-zinc-100 shadow-none [&>button]:rounded-full"
        />
        <PillSelect
          label={t("filters.entityType")}
          allLabel={t("filters.all")}
          value={entityType}
          onChange={withPageReset(setEntityType)}
          options={entityTypes.map((v) => ({ value: v, label: humanizeAction(v) }))}
        />
        <PillSelect
          label={t("filters.action")}
          allLabel={t("filters.all")}
          value={action}
          onChange={withPageReset(setAction)}
          options={(actions.data ?? []).map((v) => ({ value: v, label: humanizeAction(v) }))}
        />
        {canReadUsers ? (
          <PillSelect
            label={t("filters.actor")}
            allLabel={t("filters.all")}
            value={actorId}
            onChange={withPageReset(setActorId)}
            options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name || u.email }))}
          />
        ) : null}
        {isFiltered ? (
          <button
            type="button"
            onClick={resetFilters}
            className="h-9 rounded-full px-3 text-[13px] font-medium text-sky-600 transition-colors hover:bg-sky-50"
          >
            {t("filters.reset")}
          </button>
        ) : null}
      </div>

      <QueryState
        loading={events.loading && !page}
        error={events.error}
        errorTitle={t("loadError")}
        onRetry={() => void events.reload()}
        empty={rows.length === 0}
        emptyTitle={isFiltered ? t("emptyFiltered") : t("empty")}
      >
        <div
          className={cn("space-y-6 transition-opacity", events.loading && "opacity-60")}
          data-testid="audit-table"
        >
          {groups.map((group) => (
            <section key={group.day}>
              <h2 className="px-4 pb-2 text-[13px] font-semibold text-zinc-400">{dayLabel(group.day, locale)}</h2>
              <div className="divide-y divide-zinc-100 overflow-hidden rounded-[22px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/60">
                {group.items.map((event) => (
                  <AuditRow
                    key={event.id}
                    event={event}
                    time={timeFormat.format(new Date(event.created_at))}
                    open={openId === event.id}
                    onToggle={() => setOpenId((cur) => (cur === event.id ? null : event.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {page && page.totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 pt-2 text-[13px] text-zinc-500">
            <RoundButton
              label={t("pagination.previous")}
              disabled={page.offset === 0 || events.loading}
              onClick={() => setOffset(Math.max(0, page.offset - page.limit))}
            >
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            </RoundButton>
            <span className="tabular-nums">
              {t("pagination.summary", {
                from: formatNumber(page.offset + 1, locale),
                to: formatNumber(page.offset + rows.length, locale),
                total: formatNumber(page.total, locale),
              })}
            </span>
            <RoundButton
              label={t("pagination.next")}
              disabled={page.page >= page.totalPages || events.loading}
              onClick={() => setOffset(page.offset + page.limit)}
            >
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
            </RoundButton>
          </div>
        ) : null}
      </QueryState>
    </Screen>
  );
}

function AuditRow({
  event,
  time,
  open,
  onToggle,
}: {
  event: AuditEvent;
  time: string;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("audit");
  const { icon: Icon, tint } = lookOf(event);
  const actor = event.actor_name || t(`actorType.${event.actor_type}`);
  return (
    <div data-testid="audit-row">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("details.collapse") : t("details.expand")}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-zinc-50/80"
      >
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tint)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-zinc-900">{humanizeAction(event.action)}</span>
          <span className="block truncate text-[12px] text-zinc-500">
            {actor}
            {event.ip ? <bdi dir="ltr"> · {event.ip}</bdi> : null}
          </span>
        </span>
        <time dateTime={event.created_at} className="shrink-0 text-[12px] tabular-nums text-zinc-400">
          {time}
        </time>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-300 transition-transform duration-200 rtl:-scale-x-100",
            open && "rotate-90 rtl:rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className="bg-zinc-50/70 px-4 py-4 sm:px-16">
          <AuditEventDetails event={event} />
        </div>
      ) : null}
    </div>
  );
}

function PillSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== ALL;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 w-auto gap-1.5 rounded-full border-0 px-3.5 text-[13px] font-medium shadow-none",
          active ? "bg-zinc-900 text-white [&>svg]:text-white/70" : "bg-zinc-100 text-zinc-700",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-2xl">
        <SelectItem value={ALL}>
          {label} · {allLabel}
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200/80 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
