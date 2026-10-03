"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, CheckCheck, Repeat2, type LucideIcon } from "lucide-react";
import {
  NOTIFICATION_STATUS_LOOK,
  notificationHref,
  notificationLook,
  notificationTimestamp,
  useKindLabel,
  type AppNotification,
} from "@/entities/notification";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatRelativeTime } from "@/shared/lib/format";
import { TONES } from "@/shared/ui";

type Props = {
  notification: AppNotification;
  locale: string;
  canWrite: boolean;
  busy: boolean;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
};

/** One alert, iOS notification style: app icon, category, time, message and quick actions. */
export function NotificationCard({ notification: n, locale, canWrite, busy, onAcknowledge, onResolve }: Props) {
  const t = useTranslations("notificationCenter");
  const kindLabel = useKindLabel();
  const look = notificationLook(n.kind, n.severity);
  const statusLook = NOTIFICATION_STATUS_LOOK[n.status];
  const Icon = look.icon;
  const unread = n.status === "open";
  const resolved = n.status === "resolved";
  const href = notificationHref(n);
  const at = notificationTimestamp(n);

  return (
    <li
      className={cn(
        "group relative flex gap-3.5 rounded-[24px] bg-white p-4 ring-1 transition-shadow duration-200",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-28px_rgba(15,23,42,0.45)] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_22px_40px_-26px_rgba(15,23,42,0.5)]",
        unread ? "ring-zinc-200/80" : "ring-zinc-200/50",
      )}
      data-testid="notification-row"
      data-status={n.status}
    >
      {unread ? (
        <span className="absolute start-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-500" aria-hidden />
      ) : null}

      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]",
          TONES[resolved ? "zinc" : look.tone].gradient,
          resolved && "opacity-60",
        )}
        aria-hidden
      >
        <Icon className="h-6 w-6" strokeWidth={2.1} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400">
            {kindLabel(n.kind)}
          </span>
          <time dateTime={at} title={formatDateTime(at, locale)} className="shrink-0 text-[12px] font-medium text-zinc-400">
            {formatRelativeTime(at, locale)}
          </time>
        </div>

        <div className="mt-0.5 flex items-start gap-2">
          <p
            dir="auto"
            className={cn(
              "min-w-0 flex-1 text-start text-[15px] leading-snug tracking-tight",
              unread ? "font-bold text-zinc-950" : "font-semibold text-zinc-700",
            )}
          >
            {unread ? <span className="sr-only">{t("unread")}: </span> : null}
            {n.title}
          </p>
          {n.occurrenceCount > 1 ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-600"
              title={t("repeated", { count: n.occurrenceCount })}
            >
              <Repeat2 className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {n.occurrenceCount.toLocaleString(locale)}
            </span>
          ) : null}
        </div>

        {n.body ? (
          <p dir="auto" className="mt-1 line-clamp-3 whitespace-pre-line text-start text-[13.5px] leading-relaxed text-zinc-500">
            {n.body}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={cn("inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold", TONES[statusLook.tone].soft)}
            data-testid="notification-status"
          >
            {t(`status.${n.status}`)}
          </span>
          <span className="flex-1" />
          {href ? (
            <Link href={href} className={pill} onClick={() => unread && canWrite && onAcknowledge(n.id)}>
              {t("openRecord")}
              <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </Link>
          ) : null}
          {canWrite && unread ? (
            <Action icon={Check} disabled={busy} onClick={() => onAcknowledge(n.id)} testId="notification-acknowledge">
              {t("acknowledge")}
            </Action>
          ) : null}
          {canWrite && !resolved ? (
            <Action icon={CheckCheck} disabled={busy} onClick={() => onResolve(n.id)} strong testId="notification-resolve">
              {t("resolve")}
            </Action>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const pill =
  "inline-flex h-8 items-center gap-1 rounded-full bg-zinc-100/80 px-3 text-[12.5px] font-semibold text-zinc-700 transition hover:bg-zinc-200/70 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50";

function Action({
  icon: Icon,
  strong,
  testId,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; strong?: boolean; testId: string; children: ReactNode }) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(pill, strong && "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white")}
      {...rest}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      {children}
    </button>
  );
}
