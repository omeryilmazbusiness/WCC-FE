"use client";

import { useTranslations } from "next-intl";
import { BellRing, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  live: boolean;
  /** Shown only when there is something to acknowledge and the viewer may write. */
  canAcknowledgeAll: boolean;
  acknowledging: boolean;
  onAcknowledgeAll: () => void;
};

/** Title block: app-style icon, title, live status and the "acknowledge all" action. */
export function NotificationCenterHeader({ live, canAcknowledgeAll, acknowledging, onAcknowledgeAll }: Props) {
  const t = useTranslations("notificationCenter");
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-testid="notification-center-header">
      <div className="flex min-w-0 items-center gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.rose.gradient)} aria-hidden>
          <BellRing className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-950 sm:text-[34px] sm:leading-[40px]">{t("title")}</h1>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[13px] font-semibold ring-1 ring-inset",
            live ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-zinc-50 text-zinc-500 ring-zinc-200/70",
          )}
          data-testid="realtime-status"
          role="status"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            {live ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-zinc-400")} />
          </span>
          {live ? t("live") : t("offline")}
        </span>
        {canAcknowledgeAll ? (
          <button
            type="button"
            onClick={onAcknowledgeAll}
            disabled={acknowledging}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800 disabled:opacity-60"
            data-testid="notifications-ack-all"
          >
            {acknowledging ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            )}
            {t("acknowledgeAll")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
