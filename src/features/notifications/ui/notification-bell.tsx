"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Bell, BellRing, CheckCheck, ChevronLeft, Settings2 } from "lucide-react";
import { groupNotificationsByDay } from "@/entities/notification";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { isRtl } from "@/shared/i18n/routing";
import { cn } from "@/shared/lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { IconButton } from "@/shared/ui/icon-button";
import { TONES } from "@/shared/ui/tone";
import { useMutationFeedback } from "@/shared/ui/use-mutation-feedback";
import { useNotifications } from "../model/use-notifications";
import { BellNotificationRow } from "./bell-notification-row";
import { BellPreferences } from "./bell-preferences";

type Props = {
  surface?: "light" | "dark";
};

// Fixed instead of Radix's useId: the header renders one bell, and dev SSR can derive a different useId than hydration.
const TRIGGER_ID = "notification-bell-trigger";

/** Header bell: unread badge plus an iOS-style popup with the latest alerts and channel settings. */
export function NotificationBell({ surface = "dark" }: Props) {
  const t = useTranslations("notifications");
  const tDays = useTranslations("notificationCenter.days");
  const dir = isRtl(useLocale()) ? "rtl" : "ltr";
  const { items, unread, prefs, acknowledge, resolve, acknowledgeAll, updatePreferences } = useNotifications();
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const sections = useMemo(() => groupNotificationsByDay(items, new Date()), [items]);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      feedback.error(err);
    } finally {
      setBusyId(null);
    }
  }

  async function savePrefs(input: { emailEnabled: boolean; pushEnabled: boolean }) {
    try {
      await updatePreferences(input);
    } catch (err) {
      feedback.error(err);
      throw err;
    }
  }

  return (
    <DropdownMenu
      dir={dir}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setShowPrefs(false);
      }}
    >
      <DropdownMenuTrigger asChild id={TRIGGER_ID}>
        <IconButton
          label={t("title")}
          variant="ghost"
          data-testid="notification-bell"
          className={cn(
            "relative",
            surface === "dark"
              ? "text-zinc-400 hover:bg-white/10 hover:text-white"
              : "h-8 w-8 rounded-full text-zinc-600 transition-colors duration-200 hover:bg-zinc-950/[0.05] hover:text-zinc-950 focus-visible:ring-zinc-950/20 data-[state=open]:bg-zinc-950 data-[state=open]:text-white",
          )}
        >
          <Bell className={surface === "dark" ? "h-4 w-4" : "h-[15px] w-[15px]"} strokeWidth={surface === "dark" ? 1.75 : 1.9} />
          {unread > 0 ? (
            <span
              className={cn(
                "absolute flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                surface === "dark" ? "end-1.5 top-1.5 bg-rose-500" : "-end-0.5 -top-0.5 bg-zinc-950 tabular-nums ring-2 ring-white",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        aria-labelledby={TRIGGER_ID}
        align="end"
        sideOffset={10}
        className="w-[min(100vw-1.5rem,25rem)] rounded-[26px] border-zinc-200/60 bg-zinc-50/95 p-0 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          {showPrefs ? (
            <IconButton
              label={t("back")}
              variant="ghost"
              className="h-9 w-9 rounded-full bg-white text-zinc-700 ring-1 ring-zinc-200/70 hover:text-zinc-950"
              onClick={() => setShowPrefs(false)}
            >
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.4} />
            </IconButton>
          ) : (
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]", TONES.rose.gradient)} aria-hidden>
              <BellRing className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <DropdownMenuLabel className="truncate p-0 text-[17px] font-bold normal-case tracking-tight text-zinc-950">
              {showPrefs ? t("preferences") : t("title")}
            </DropdownMenuLabel>
            {!showPrefs ? (
              <p className="text-[12px] font-medium text-zinc-500">
                {unread > 0 ? t("unreadCount", { count: unread }) : t("allRead")}
              </p>
            ) : null}
          </div>
          {!showPrefs && unread > 0 ? (
            <button
              type="button"
              onClick={() => void run("all", acknowledgeAll)}
              disabled={busyId !== null}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition hover:brightness-95 disabled:opacity-50",
                TONES.sky.soft,
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              {t("markAllRead")}
            </button>
          ) : null}
          {!showPrefs ? (
            <IconButton
              label={t("preferences")}
              variant="ghost"
              className="h-8 w-8 rounded-full bg-white text-zinc-500 ring-1 ring-zinc-200/70 hover:text-zinc-950"
              onClick={() => setShowPrefs(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </IconButton>
          ) : null}
        </div>

        {showPrefs ? (
          <BellPreferences prefs={prefs} onSave={savePrefs} onDone={() => setShowPrefs(false)} />
        ) : (
          <>
            <div className="mx-2 max-h-[26rem] overflow-y-auto rounded-[22px] bg-white p-1.5 ring-1 ring-zinc-200/60">
              {sections.length === 0 ? (
                <AllCaughtUp title={t("empty")} body={t("emptyBody")} />
              ) : (
                sections.map((section) => (
                  <section key={section.day} aria-label={tDays(section.day)}>
                    <h3 className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{tDays(section.day)}</h3>
                    <ul>
                      {section.items.map((n) => (
                        <BellNotificationRow
                          key={n.id}
                          notification={n}
                          busy={busyId !== null}
                          onAcknowledge={(id) => void run(id, () => acknowledge(id))}
                          onResolve={(id) => void run(id, () => resolve(id))}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
            <div className="p-2">
              <Link
                href={routes.notifications}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-[16px] text-[13px] font-semibold text-zinc-700 transition hover:bg-white hover:text-zinc-950"
              >
                {t("viewAll")}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AllCaughtUp({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className={cn("flex h-14 w-14 items-center justify-center rounded-[18px]", TONES.emerald.gradient)} aria-hidden>
        <CheckCheck className="h-7 w-7" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-[15px] font-bold tracking-tight text-zinc-950">{title}</p>
      <p className="mt-1 max-w-[16rem] text-[12.5px] leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}
