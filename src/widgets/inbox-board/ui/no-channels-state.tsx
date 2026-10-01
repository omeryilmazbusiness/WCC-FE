"use client";

import { useTranslations } from "next-intl";
import { Loader2, PlugZap } from "lucide-react";
import { CHANNEL_LOOK, SOCIAL_CHANNELS } from "@/entities/conversation";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  /** Present when the viewer can connect channels; otherwise they are asked to wait. */
  onConnect?: () => void;
  connecting?: boolean;
};

/** Shown instead of the chat screens until at least one real channel is connected. */
export function NoChannelsState({ onConnect, connecting }: Props) {
  const t = useTranslations("inbox.noChannels");
  const ts = useTranslations("inboxSetup");
  return (
    <section
      className="flex flex-col items-center rounded-[32px] bg-white px-8 py-16 text-center shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_24px_50px_-36px_rgba(15,23,42,0.35)]"
      data-testid="inbox-no-channels"
    >
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-[22px]", TONES.sky.gradient)} aria-hidden>
        <PlugZap className="h-7 w-7" strokeWidth={2} />
      </span>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-zinc-950">{onConnect ? t("title") : ts("waitingTitle")}</h2>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-zinc-500">{onConnect ? t("body") : ts("waitingBody")}</p>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label={t("channels")}>
        {SOCIAL_CHANNELS.map((channel) => {
          const look = CHANNEL_LOOK[channel];
          const Glyph = look.glyph;
          return (
            <li key={channel} className="flex w-20 flex-col items-center gap-2">
              <span className={cn("flex h-14 w-14 items-center justify-center rounded-[18px]", TONES[look.tone].soft)}>
                <Glyph className="h-6 w-6" />
              </span>
              <span className="text-[12px] font-semibold text-zinc-600">{look.name}</span>
            </li>
          );
        })}
      </ul>
      {onConnect ? (
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(15,23,42,0.8)] transition-colors hover:bg-zinc-800 disabled:opacity-60"
          data-testid="inbox-connect-channels"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlugZap className="h-4 w-4" aria-hidden />}
          {t("connect")}
        </button>
      ) : null}
    </section>
  );
}
