"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleCheck,
  Info,
  X,
} from "lucide-react";
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/model/notification-store";
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
 * Reusable notification popup — drop into any shell/header.
 */
export function NotificationBell({ surface = "dark" }: Props) {
  const t = useTranslations("notifications");
  const { items, unread } = useNotifications();

  return (
    <DropdownMenu>
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
        className="w-[min(100vw-2rem,22rem)] p-0"
        sideOffset={10}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 normal-case tracking-normal text-[15px] text-zinc-950">
            {t("title")}
          </DropdownMenuLabel>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => markAllNotificationsRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markAllRead")}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />

        <ul className="max-h-[22rem] overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-10 text-center text-sm font-medium text-zinc-500">
              {t("empty")}
            </li>
          ) : (
            items.map((item) => {
              const meta = toneMeta[item.tone ?? "default"];
              const Icon = meta.icon;
              const content = (
                <>
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
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          item.read ? "text-zinc-700" : "text-zinc-950",
                        )}
                      >
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-zinc-500">
                      {item.body}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={item.id} className="group relative">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => markNotificationRead(item.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 transition-all duration-300 hover:bg-zinc-50",
                        !item.read && "bg-zinc-50/80",
                      )}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(item.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-start transition-all duration-300 hover:bg-zinc-50",
                        !item.read && "bg-zinc-50/80",
                      )}
                    >
                      {content}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t("dismiss")}
                    onClick={() => dismissNotification(item.id)}
                    className="absolute end-2 top-2 rounded-lg p-1 text-zinc-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
