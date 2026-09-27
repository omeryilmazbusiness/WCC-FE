"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, CheckCheck, ExternalLink, Info, Layers } from "lucide-react";
import {
  createNotificationRepository,
  notificationHref,
  type AppNotification,
  type NotificationGroup,
  type NotificationSeverity,
  type NotificationStatus,
} from "@/entities/notification";
import { useCan } from "@/entities/viewer";
import { routes } from "@/shared/config/routes";
import { Link, usePathname, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/format";
import { pageCountOf } from "@/shared/lib/pagination";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useRealtime, useRealtimeStatus } from "@/shared/lib/use-realtime";
import {
  Badge,
  Button,
  PageHeader,
  Pager,
  QueryState,
  Screen,
  SegmentedControl,
  useMutationFeedback,
} from "@/shared/ui";

const PAGE_SIZE = 25;

type StatusFilter = "active" | NotificationStatus;

const severityMeta: Record<NotificationSeverity, { icon: typeof Info; className: string }> = {
  critical: { icon: AlertTriangle, className: "bg-rose-50 text-rose-700" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  info: { icon: Info, className: "bg-zinc-100 text-zinc-700" },
};

const statusTone: Record<NotificationStatus, string> = {
  open: "bg-rose-50 text-rose-700",
  acknowledged: "bg-amber-50 text-amber-800",
  resolved: "bg-emerald-50 text-emerald-800",
};

function isStatusFilter(v: string | null): v is StatusFilter {
  return v === "active" || v === "open" || v === "acknowledged" || v === "resolved";
}

/**
 * Notification center (T-287): grouped view per kind → filtered list, acknowledge /
 * resolve, live over the realtime stream. Filters live in the URL so a group is linkable.
 */
export function NotificationCenterBoard() {
  const t = useTranslations("notificationCenter");
  const tn = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const feedback = useMutationFeedback();
  const canWrite = useCan("notifications.write");
  const repo = useMemo(() => createNotificationRepository(), []);
  const live = useRealtimeStatus() === "open";

  const kind = search.get("kind") ?? "";
  const rawStatus = search.get("status");
  const status: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "active";
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setFilter = useCallback(
    (next: { kind?: string; status?: StatusFilter }) => {
      const sp = new URLSearchParams(search.toString());
      const k = next.kind ?? kind;
      const s = next.status ?? status;
      if (k) sp.set("kind", k);
      else sp.delete("kind");
      if (s !== "active") sp.set("status", s);
      else sp.delete("status");
      setPage(0);
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [search, kind, status, router, pathname],
  );

  const groups = useApiQuery(() => repo.summary(), [repo]);
  const list = useApiQuery(
    () =>
      repo.list({
        kinds: kind ? [kind] : undefined,
        status: status === "active" ? undefined : status,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [repo, kind, status, page],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([groups.refresh(), list.refresh()]);
  }, [groups, list]);

  useRealtime(() => void refreshAll(), { types: ["notification"] }, { debounceMs: 300 });

  async function act(id: string | null, fn: () => Promise<unknown>) {
    setBusyId(id ?? "all");
    try {
      await fn();
      await refreshAll();
    } catch (err) {
      feedback.error(err);
    } finally {
      setBusyId(null);
    }
  }

  const groupRows = groups.data ?? [];
  const totals = groupRows.reduce(
    (acc, g) => ({ open: acc.open + g.open, acknowledged: acc.acknowledged + g.acknowledged }),
    { open: 0, acknowledged: 0 },
  );
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = pageCountOf(total, PAGE_SIZE);
  const selected = groupRows.find((g) => g.kind === kind);

  return (
    <Screen data-testid="notification-center" className="!space-y-4">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold",
                live ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-500",
              )}
              data-testid="realtime-status"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-emerald-500" : "bg-zinc-400")} />
              {live ? t("live") : t("offline")}
            </span>
            {canWrite && totals.open > 0 ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId !== null}
                onClick={() => void act(null, () => repo.acknowledgeAll())}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {tn("markAllRead")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-200/80 bg-white p-2" aria-label={t("groups")}>
          <QueryState loading={groups.loading} error={groups.error} onRetry={() => void groups.reload()}>
            <ul className="space-y-1">
              <li>
                <GroupButton
                  active={!kind}
                  title={t("allKinds")}
                  open={totals.open}
                  acknowledged={totals.acknowledged}
                  onClick={() => setFilter({ kind: "" })}
                />
              </li>
              {groupRows.map((g) => (
                <li key={g.kind}>
                  <GroupButton
                    active={g.kind === kind}
                    group={g}
                    title={g.title || g.kind}
                    open={g.open}
                    acknowledged={g.acknowledged}
                    onClick={() => setFilter({ kind: g.kind })}
                    subtitle={formatRelativeTime(g.latestAt, locale)}
                  />
                </li>
              ))}
            </ul>
          </QueryState>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {selected ? selected.title || selected.kind : t("allKinds")}
              </p>
              <p className="text-xs text-zinc-500">{t("count", { count: total })}</p>
            </div>
            <SegmentedControl<StatusFilter>
              aria-label={t("statusFilter")}
              value={status}
              onChange={(s) => setFilter({ status: s })}
              options={[
                { value: "active", label: t("status.active") },
                { value: "open", label: t("status.open") },
                { value: "acknowledged", label: t("status.acknowledged") },
                { value: "resolved", label: t("status.resolved") },
              ]}
            />
          </div>

          <QueryState
            loading={list.loading && !list.data}
            error={list.error}
            onRetry={() => void list.reload()}
            empty={items.length === 0}
            emptyTitle={tn("empty")}
          >
            <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  locale={locale}
                  busy={busyId === n.id}
                  canWrite={canWrite}
                  onAcknowledge={() => void act(n.id, () => repo.acknowledge(n.id))}
                  onResolve={() => void act(n.id, () => repo.resolve(n.id))}
                  labels={{
                    acknowledge: tn("acknowledge"),
                    resolve: tn("resolve"),
                    open: t("openRecord"),
                    status: t(`status.${n.status}`),
                  }}
                />
              ))}
            </ul>
            <Pager page={page} pageCount={pages} onPageChange={setPage} className="pt-1" />
          </QueryState>
          <p className="text-xs text-zinc-400">
            {t("settingsHint")}{" "}
            <Link href={routes.adminSettings} className="font-medium text-zinc-600 hover:underline">
              {t("settingsLink")}
            </Link>
          </p>
        </section>
      </div>
    </Screen>
  );
}

function GroupButton({
  active,
  group,
  title,
  subtitle,
  open,
  acknowledged,
  onClick,
}: {
  active: boolean;
  group?: NotificationGroup;
  title: string;
  subtitle?: string;
  open: number;
  acknowledged: number;
  onClick: () => void;
}) {
  const meta = group ? severityMeta[group.severity] ?? severityMeta.info : null;
  const Icon = meta?.icon ?? Layers;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
        active ? "bg-zinc-950 text-white" : "hover:bg-zinc-50",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-white/10 text-white" : (meta?.className ?? "bg-zinc-100 text-zinc-700"),
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {subtitle ? (
          <span className={cn("block text-[11px]", active ? "text-zinc-300" : "text-zinc-400")}>
            {subtitle}
          </span>
        ) : null}
      </span>
      {open > 0 ? (
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{open}</span>
      ) : null}
      {acknowledged > 0 ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600",
          )}
        >
          {acknowledged}
        </span>
      ) : null}
    </button>
  );
}

function NotificationRow({
  n,
  locale,
  busy,
  canWrite,
  onAcknowledge,
  onResolve,
  labels,
}: {
  n: AppNotification;
  locale: string;
  busy: boolean;
  canWrite: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  labels: { acknowledge: string; resolve: string; open: string; status: string };
}) {
  const meta = severityMeta[n.severity] ?? severityMeta.info;
  const Icon = meta.icon;
  const href = notificationHref(n);
  return (
    <li className="flex items-start gap-3 px-4 py-3" data-testid="notification-row">
      <span className={cn("mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", meta.className)}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className={cn("truncate text-sm font-semibold", n.status === "open" ? "text-zinc-950" : "text-zinc-600")}>
            {n.title}
          </p>
          {n.occurrenceCount > 1 ? (
            <span className="text-[11px] font-semibold text-zinc-500">×{n.occurrenceCount}</span>
          ) : null}
          <Badge data-testid="notification-status" className={cn("normal-case", statusTone[n.status])}>{labels.status}</Badge>
          <span className="text-[11px] text-zinc-400">{formatRelativeTime(n.updatedAt || n.createdAt, locale)}</span>
        </div>
        {n.body ? <p className="mt-0.5 line-clamp-2 text-[13px] text-zinc-500">{n.body}</p> : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {href ? (
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
              <Link href={href}>
                <ExternalLink className="h-3 w-3" />
                {labels.open}
              </Link>
            </Button>
          ) : null}
          {canWrite && n.status === "open" ? (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" disabled={busy} onClick={onAcknowledge}>
              <Check className="h-3 w-3" />
              {labels.acknowledge}
            </Button>
          ) : null}
          {canWrite && n.status !== "resolved" ? (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" disabled={busy} onClick={onResolve}>
              <CheckCheck className="h-3 w-3" />
              {labels.resolve}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
