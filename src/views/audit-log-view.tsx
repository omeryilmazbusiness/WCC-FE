"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_PAGE_SIZE,
  AuditActorTypeBadge,
  AuditEventDetails,
  createAuditRepository,
  endOfDayRfc3339,
  startOfDayRfc3339,
  type AuditEvent,
  type AuditFilters,
} from "@/entities/audit";
import { listUsers } from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  Badge,
  Button,
  Input,
  Label,
  PageHeader,
  QueryState,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMutationFeedback,
} from "@/shared/ui";

const repo = createAuditRepository();
const ALL = "all";
const ENTITY_ID_DEBOUNCE_MS = 350;

const orUndefined = (value: string) => (value === ALL || !value ? undefined : value);
const shortId = (id: string | null) => (id ? id.slice(0, 8) : "—");

export function AuditLogView() {
  const t = useTranslations("audit");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canReadUsers = useCan("users.read");

  const [entityType, setEntityType] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [actorId, setActorId] = useState(ALL);
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [entityIdInput, setEntityIdInput] = useState("");
  const [entityId, setEntityId] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntityId(entityIdInput.trim());
      setOffset(0);
    }, ENTITY_ID_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [entityIdInput]);

  const filters = useMemo<AuditFilters>(
    () => ({
      entityType: orUndefined(entityType),
      action: orUndefined(action),
      actorId: orUndefined(actorId),
      entityId: orUndefined(entityId),
      from: fromDay ? startOfDayRfc3339(fromDay) : undefined,
      to: toDay ? endOfDayRfc3339(toDay) : undefined,
    }),
    [entityType, action, actorId, entityId, fromDay, toDay],
  );

  const events = useApiQuery(() => repo.list(filters, { limit: AUDIT_PAGE_SIZE, offset }), [filters, offset]);
  const actions = useApiQuery(() => repo.listActions(), []);
  const users = useApiQuery(() => listUsers(), [], { enabled: canReadUsers });

  const entityTypes = useMemo(() => {
    const fromActions = (actions.data ?? []).map((a) => a.split(".")[0]).filter(Boolean);
    return [...new Set<string>([...AUDIT_ENTITY_TYPES, ...fromActions])].sort();
  }, [actions.data]);

  const page = events.data;
  const rows = page?.items ?? [];
  const isFiltered = Object.values(filters).some(Boolean);

  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setOffset(0);
    };
  }

  function resetFilters() {
    setEntityType(ALL);
    setAction(ALL);
    setActorId(ALL);
    setFromDay("");
    setToDay("");
    setEntityIdInput("");
    setEntityId("");
    setOffset(0);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => void exportCsv()}
            data-testid="audit-export-csv"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            {t("exportCsv")}
          </Button>
        }
      />

      <div className="grid gap-3 rounded-[24px] border border-zinc-200/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FilterSelect
          label={t("filters.entityType")}
          value={entityType}
          onChange={withPageReset(setEntityType)}
          allLabel={t("filters.all")}
          options={entityTypes.map((v) => ({ value: v, label: v }))}
        />
        <FilterSelect
          label={t("filters.action")}
          value={action}
          onChange={withPageReset(setAction)}
          allLabel={t("filters.all")}
          options={(actions.data ?? []).map((v) => ({ value: v, label: v }))}
          mono
        />
        {canReadUsers ? (
          <FilterSelect
            label={t("filters.actor")}
            value={actorId}
            onChange={withPageReset(setActorId)}
            allLabel={t("filters.all")}
            options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name || u.email }))}
          />
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="audit-from">{t("filters.from")}</Label>
          <Input
            id="audit-from"
            type="date"
            value={fromDay}
            max={toDay || undefined}
            onChange={(e) => withPageReset(setFromDay)(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-to">{t("filters.to")}</Label>
          <Input
            id="audit-to"
            type="date"
            value={toDay}
            min={fromDay || undefined}
            onChange={(e) => withPageReset(setToDay)(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-entity-id">{t("filters.entityId")}</Label>
          <Input
            id="audit-entity-id"
            dir="ltr"
            value={entityIdInput}
            placeholder={t("filters.entityIdPlaceholder")}
            onChange={(e) => setEntityIdInput(e.target.value)}
          />
        </div>
        {isFiltered ? (
          <div className="flex items-end sm:col-span-full">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              {t("filters.reset")}
            </Button>
          </div>
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
          className={cn(
            "rounded-[24px] border border-zinc-200/80 bg-white transition-opacity",
            events.loading && "opacity-60",
          )}
        >
          <Table data-testid="audit-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead>{t("columns.time")}</TableHead>
                <TableHead>{t("columns.actor")}</TableHead>
                <TableHead>{t("columns.action")}</TableHead>
                <TableHead>{t("columns.entity")}</TableHead>
                <TableHead>{t("columns.ip")}</TableHead>
                <TableHead>{t("columns.session")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((event) => (
                <AuditRow
                  key={event.id}
                  event={event}
                  locale={locale}
                  open={expanded.has(event.id)}
                  onToggle={() => toggle(event.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {page ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
            <span>
              {t("pagination.summary", {
                from: formatNumber(page.offset + 1, locale),
                to: formatNumber(page.offset + rows.length, locale),
                total: formatNumber(page.total, locale),
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page.offset === 0 || events.loading}
                onClick={() => setOffset(Math.max(0, page.offset - page.limit))}
              >
                <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
                {t("pagination.previous")}
              </Button>
              <span className="tabular-nums">
                {t("pagination.page", { page: page.page, pages: Math.max(1, page.totalPages) })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page.page >= page.totalPages || events.loading}
                onClick={() => setOffset(page.offset + page.limit)}
              >
                {t("pagination.next")}
                <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        ) : null}
      </QueryState>
    </Screen>
  );
}

function AuditRow({
  event,
  locale,
  open,
  onToggle,
}: {
  event: AuditEvent;
  locale: string;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("audit");
  return (
    <Fragment>
      <TableRow className="cursor-pointer" onClick={onToggle} data-testid="audit-row">
        <TableCell className="px-3">
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t("details.collapse") : t("details.expand")}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", !open && "-rotate-90 rtl:rotate-90")}
            />
          </button>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <time dateTime={event.created_at}>{formatDateTime(event.created_at, locale)}</time>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900">{event.actor_name || "—"}</span>
            <AuditActorTypeBadge type={event.actor_type} />
          </div>
        </TableCell>
        <TableCell>
          <span className="font-mono text-xs text-zinc-800">{event.action}</span>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="normal-case">{event.entity_type || "—"}</Badge>
            <span className="font-mono text-[11px] text-zinc-500" title={event.entity_id ?? undefined}>
              {shortId(event.entity_id)}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <bdi dir="ltr" className="font-mono text-xs text-zinc-600">
            {event.ip || "—"}
          </bdi>
        </TableCell>
        <TableCell>
          <span className="font-mono text-[11px] text-zinc-500" title={event.session_id ?? undefined}>
            {shortId(event.session_id)}
          </span>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
          <TableCell colSpan={7} className="px-5 py-5">
            <AuditEventDetails event={event} />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className={cn(mono && "font-mono text-xs")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className={cn(mono && "font-mono text-xs")}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
