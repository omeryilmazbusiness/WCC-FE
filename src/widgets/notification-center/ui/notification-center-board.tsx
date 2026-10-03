"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";
import { createNotificationRepository, type NotificationRepository } from "@/entities/notification";
import { useCan } from "@/entities/viewer";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { Pager, QueryState, Screen, SegmentedControl } from "@/shared/ui";
import { useKindLabel } from "../model/use-kind-label";
import {
  NOTIFICATION_STATUS_FILTERS,
  useNotificationCenter,
  type NotificationStatusFilter,
} from "../model/use-notification-center";
import { NotificationCategories } from "./notification-categories";
import { NotificationCenterHeader } from "./notification-center-header";
import { NotificationFeed } from "./notification-feed";
import { NotificationStats } from "./notification-stats";

type Props = {
  /** Injected for tests and previews; defaults to the API-backed repository. */
  repository?: NotificationRepository;
};

/**
 * Notification center: categories by kind, a day-grouped feed with acknowledge / resolve,
 * live over the realtime stream. Composition only; state lives in `useNotificationCenter`.
 */
export function NotificationCenterBoard({ repository }: Props) {
  const t = useTranslations("notificationCenter");
  const locale = useLocale();
  const canWrite = useCan("notifications.write");
  const kindLabel = useKindLabel();
  const repo = useMemo(() => repository ?? createNotificationRepository(), [repository]);
  const c = useNotificationCenter(repo);

  const heading = c.selectedGroup ? kindLabel(c.selectedGroup.kind, c.selectedGroup.title) : t("allKinds");

  return (
    <Screen data-testid="notification-center">
      <NotificationCenterHeader
        live={c.live}
        canAcknowledgeAll={canWrite && c.totals.open > 0}
        acknowledging={c.busy === "all"}
        onAcknowledgeAll={() => void c.acknowledgeAll()}
      />

      <NotificationStats totals={c.totals} locale={locale} status={c.status} onSelectStatus={c.selectStatus} />

      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 lg:sticky lg:top-4">
          <QueryState loading={c.groups.loading && !c.groups.data} loadingVariant="list" error={c.groups.error} onRetry={() => void c.groups.reload()}>
            <NotificationCategories
              groups={c.groupRows}
              totals={c.totals}
              selectedKind={c.kind}
              locale={locale}
              onSelect={c.selectKind}
            />
          </QueryState>
        </aside>

        <section className="min-w-0 space-y-4" aria-label={heading}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-bold tracking-tight text-zinc-950" data-testid="notification-heading">
                {heading}
              </h2>
              <p className="text-[12.5px] font-medium text-zinc-500">{t("count", { count: c.total })}</p>
            </div>
            <SegmentedControl<NotificationStatusFilter>
              aria-label={t("statusFilter")}
              size="lg"
              value={c.status}
              onChange={c.selectStatus}
              className="rounded-[18px] bg-white/80"
              options={NOTIFICATION_STATUS_FILTERS.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          </div>

          <QueryState loading={c.list.loading && !c.list.data} loadingVariant="list" error={c.list.error} onRetry={() => void c.list.reload()}>
            <NotificationFeed
              items={c.items}
              status={c.status}
              locale={locale}
              canWrite={canWrite}
              busy={c.busy}
              onAcknowledge={(id) => void c.acknowledge(id)}
              onResolve={(id) => void c.resolve(id)}
            />
            <Pager page={c.page} pageCount={c.pageCount} onPageChange={c.setPage} className="pt-1" />
          </QueryState>

          <p className="flex items-center gap-1.5 px-1 text-[12px] text-zinc-400">
            <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {t("settingsHint")}{" "}
              <Link href={routes.adminSettings} className="font-semibold text-zinc-600 hover:underline">
                {t("settingsLink")}
              </Link>
            </span>
          </p>
        </section>
      </div>
    </Screen>
  );
}
