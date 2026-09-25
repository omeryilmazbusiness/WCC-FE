"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CircleCheck,
  Info,
  Settings2,
  X,
} from "lucide-react";
import { useNotifications } from "@/features/notifications/model/use-notifications";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { IconButton } from "@/shared/ui/icon-button";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const toneMeta = {
  default: { icon: Info, className: "bg-zinc-100 text-zinc-700" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  critical: { icon: AlertTriangle, className: "bg-rose-50 text-rose-700" },
  success: { icon: CircleCheck, className: "bg-emerald-50 text-emerald-700" },
} as const;

type Props = {
  surface?: "light" | "dark";
};

/**
 * Notification center — in-app mandatory channel + ack/resolve + external prefs.
 */
export function NotificationBell({ surface = "dark" }: Props) {
  const t = useTranslations("notifications");
  const {
    items,
    unread,
    prefs,
    acknowledge,
    resolve,
    acknowledgeAll,
    updatePreferences,
  } = useNotifications();
  const [showPrefs, setShowPrefs] = useState(false);
  const [emailOn, setEmailOn] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  function openPrefs() {
    setEmailOn(prefs?.emailEnabled ?? false);
    setPushOn(prefs?.pushEnabled ?? false);
    setShowPrefs(true);
  }

  async function savePrefs() {
    setSavingPrefs(true);
    try {
      await updatePreferences({ emailEnabled: emailOn, pushEnabled: pushOn });
      setShowPrefs(false);
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setShowPrefs(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <IconButton
          label={t("title")}
          variant="ghost"
          className={cn(
            "relative",
            surface === "dark"
              ? "text-zinc-400 hover:bg-white/10 hover:text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950",
          )}
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unread > 0 ? (
            <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,24rem)] p-0"
        sideOffset={10}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <DropdownMenuLabel className="p-0 normal-case tracking-normal text-[15px] text-zinc-950">
            {showPrefs ? t("preferences") : t("title")}
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {!showPrefs && unread > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => void acknowledgeAll()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("markAllRead")}
              </Button>
            ) : null}
            <IconButton
              label={t("preferences")}
              variant="ghost"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-950"
              onClick={() => (showPrefs ? setShowPrefs(false) : openPrefs())}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {showPrefs ? (
          <div className="space-y-4 p-4">
            <p className="text-[13px] font-medium text-zinc-500">
              {t("prefsHint")}
            </p>
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-800">
              <span>{t("inApp")}</span>
              <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-500">
                {t("mandatory")}
              </span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-zinc-800">
              <span>{t("email")}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={emailOn}
                onChange={(e) => setEmailOn(e.target.checked)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-zinc-800">
              <span>{t("push")}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={pushOn}
                onChange={(e) => setPushOn(e.target.checked)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPrefs(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={savingPrefs}
                onClick={() => void savePrefs()}
              >
                {t("savePrefs")}
              </Button>
            </div>
          </div>
        ) : (
          <ul className="max-h-[22rem] overflow-y-auto p-2">
            {items.length === 0 ? (
              <li className="px-3 py-10 text-center text-sm font-medium text-zinc-500">
                {t("empty")}
              </li>
            ) : (
              items.map((item) => {
                const meta = toneMeta[item.tone ?? "default"];
                const Icon = meta.icon;
                return (
                  <li key={item.id} className="group relative">
                    <div
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 transition-all duration-300 hover:bg-zinc-50",
                        !item.read && "bg-zinc-50/80",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                          meta.className,
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          {item.href ? (
                            <Link
                              href={item.href}
                              onClick={() => void acknowledge(item.id)}
                              className={cn(
                                "truncate text-sm font-semibold hover:underline",
                                item.read ? "text-zinc-700" : "text-zinc-950",
                              )}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <p
                              className={cn(
                                "truncate text-sm font-semibold",
                                item.read ? "text-zinc-700" : "text-zinc-950",
                              )}
                            >
                              {item.title}
                            </p>
                          )}
                          <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-zinc-500">
                          {item.body}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.status === "open" ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                              onClick={() => void acknowledge(item.id)}
                            >
                              <Check className="h-3 w-3" />
                              {t("acknowledge")}
                            </button>
                          ) : null}
                          {item.status !== "resolved" ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                              onClick={() => void resolve(item.id)}
                            >
                              <CheckCheck className="h-3 w-3" />
                              {t("resolve")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={t("dismiss")}
                        onClick={() => void resolve(item.id)}
                        className="rounded-lg p-1 text-zinc-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
