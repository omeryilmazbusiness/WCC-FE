"use client";

import { useTranslations } from "next-intl";
import { Inbox, Loader2, Settings2 } from "lucide-react";
import { channelLook, type ChannelHealth } from "@/entities/conversation";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  health: ChannelHealth[];
  onManageChannels?: () => void;
  managing?: boolean;
};

function healthState(status: string): "live" | "degraded" | "down" {
  if (status === "degraded") return "degraded";
  if (status === "down") return "down";
  return "live";
}

const DOT = { live: "bg-emerald-500", degraded: "bg-amber-500", down: "bg-rose-500" } as const;

/** Title block with connected channels and their health. */
export function InboxHeader({ health, onManageChannels, managing }: Props) {
  const t = useTranslations("inbox");
  const ts = useTranslations("inboxSetup");
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-testid="inbox-header">
      <div className="flex min-w-0 items-center gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.sky.gradient)} aria-hidden>
          <Inbox className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight text-zinc-950 sm:text-[34px] sm:leading-[40px]">{t("title")}</h1>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ul className="flex flex-wrap items-center gap-2" data-testid="channel-health">
          {health.map((h) => {
            const look = channelLook(h.provider);
            const Glyph = look.glyph;
            const state = healthState(String(h.status));
            return (
              <li
                key={h.provider}
                title={h.lastError || t(`health.${state}`)}
                className="flex h-11 items-center gap-2 rounded-full bg-white/80 pe-3.5 ps-1.5 shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", TONES[look.tone].soft)}>
                  <Glyph className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-semibold text-zinc-800">{h.displayName || look.name}</span>
                <span className={cn("h-2 w-2 rounded-full", DOT[state])} aria-label={t(`health.${state}`)} role="img" />
              </li>
            );
          })}
        </ul>
        {onManageChannels ? (
          <button
            type="button"
            onClick={onManageChannels}
            disabled={managing}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.8)] transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-60"
            data-testid="inbox-manage-channels"
          >
            {managing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Settings2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
            {ts("manageChannels")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
