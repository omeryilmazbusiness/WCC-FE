"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BellOff, CheckCheck } from "lucide-react";
import { groupNotificationsByDay, type AppNotification } from "@/entities/notification";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import type { BusyTarget, NotificationStatusFilter } from "../model/use-notification-center";
import { NotificationCard } from "./notification-card";

type Props = {
  items: readonly AppNotification[];
  status: NotificationStatusFilter;
  locale: string;
  canWrite: boolean;
  busy: BusyTarget;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
};

/** The list, split into Today / Yesterday / Earlier like the iOS notification center. */
export function NotificationFeed({ items, status, locale, canWrite, busy, onAcknowledge, onResolve }: Props) {
  const t = useTranslations("notificationCenter");
  const sections = useMemo(() => groupNotificationsByDay(items, new Date()), [items]);

  if (sections.length === 0) return <AllCaughtUp status={status} />;

  return (
    <div className="space-y-5" data-testid="notification-feed">
      {sections.map((section) => (
        <section key={section.day} aria-labelledby={`notification-day-${section.day}`}>
          <h3
            id={`notification-day-${section.day}`}
            className="mb-2 px-1 text-[13px] font-semibold tracking-tight text-zinc-500"
          >
            {t(`days.${section.day}`)}
          </h3>
          <ul className="space-y-2.5">
            {section.items.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                locale={locale}
                canWrite={canWrite}
                busy={busy === n.id || busy === "all"}
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AllCaughtUp({ status }: { status: NotificationStatusFilter }) {
  const t = useTranslations("notificationCenter.empty");
  const calm = status === "active" || status === "open";
  const Icon = calm ? CheckCheck : BellOff;
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[28px] bg-white px-6 py-14 text-center ring-1 ring-zinc-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid="notification-empty"
    >
      <span
        className={cn("flex h-16 w-16 items-center justify-center rounded-[22px]", TONES[calm ? "emerald" : "zinc"].gradient)}
        aria-hidden
      >
        <Icon className="h-8 w-8" strokeWidth={2.1} />
      </span>
      <p className="text-[17px] font-bold tracking-tight text-zinc-950">{t(`${status}.title`)}</p>
      <p className="max-w-sm text-[13.5px] font-medium leading-relaxed text-zinc-500">{t(`${status}.body`)}</p>
    </div>
  );
}
