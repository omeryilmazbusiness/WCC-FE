"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CheckCheck, Repeat2, type LucideIcon } from "lucide-react";
import {
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
  busy: boolean;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onNavigate: () => void;
};

/** One alert in the header popup: colourful app icon, category, time, message and quick actions. */
export function BellNotificationRow({ notification: n, busy, onAcknowledge, onResolve, onNavigate }: Props) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const kindLabel = useKindLabel();
  const look = notificationLook(n.kind, n.severity);
  const Icon = look.icon;
  const unread = n.status === "open";
  const href = notificationHref(n);
  const at = notificationTimestamp(n);

  const title = (
    <>
      {unread ? <span className="sr-only">{t("unread")}: </span> : null}
      <span dir="auto" className="block text-start">
        {n.title}
      </span>
    </>
  );
  const titleClass = cn(
    "break-words text-start text-[14px] leading-snug tracking-tight",
    unread ? "font-bold text-zinc-950" : "font-semibold text-zinc-600",
  );

  return (
    <li
      className="group relative flex gap-3 rounded-[18px] px-3 py-3 transition-colors duration-200 hover:bg-zinc-50"
      data-testid="bell-notification"
      data-status={n.status}
    >
      {unread ? <span className="absolute start-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-500" aria-hidden /> : null}

      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]",
          TONES[look.tone].gradient,
          !unread && "opacity-70",
        )}
        aria-hidden
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {kindLabel(n.kind)}
          </span>
          {n.occurrenceCount > 1 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-zinc-100 px-1.5 py-px text-[10.5px] font-bold tabular-nums text-zinc-500">
              <Repeat2 className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {n.occurrenceCount.toLocaleString(locale)}
            </span>
          ) : null}
          <time dateTime={at} title={formatDateTime(at, locale)} className="shrink-0 text-[11.5px] font-medium text-zinc-400">
            {formatRelativeTime(at, locale)}
          </time>
        </div>

        {href ? (
          <Link
            href={href}
            onClick={() => {
              if (unread) onAcknowledge(n.id);
              onNavigate();
            }}
            className={cn(titleClass, "mt-0.5 block after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none")}
          >
            {title}
          </Link>
        ) : (
          <p className={cn(titleClass, "mt-0.5")}>
            {title}
          </p>
        )}

        {n.body ? (
          <p dir="auto" className="mt-0.5 line-clamp-2 text-start text-[12.5px] leading-relaxed text-zinc-500">
            {n.body}
          </p>
        ) : null}

        <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
          {unread ? (
            <QuickAction icon={Check} disabled={busy} onClick={() => onAcknowledge(n.id)}>
              {t("acknowledge")}
            </QuickAction>
          ) : null}
          <QuickAction icon={CheckCheck} disabled={busy} onClick={() => onResolve(n.id)} strong>
            {t("resolve")}
          </QuickAction>
        </div>
      </div>
    </li>
  );
}

function QuickAction({
  icon: Icon,
  strong,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; strong?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50",
        strong ? "bg-zinc-950 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-950",
      )}
      {...rest}
    >
      <Icon className="h-3 w-3" strokeWidth={2.6} aria-hidden />
      {children}
    </button>
  );
}
