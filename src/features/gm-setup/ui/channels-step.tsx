"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Mail, MessageCircle } from "lucide-react";
import {
  SOCIAL_CHANNELS,
  createConversationRepository,
  type ConnectCredentials,
  type SocialChannel,
} from "@/entities/conversation";
import type { SetupOverview, SetupRepository } from "@/entities/setup";
import { useActiveBranchId } from "@/features/branch-scope";
import { ConnectChannelDialog } from "@/features/inbox-setup";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { cn } from "@/shared/lib/cn";
import { useMutationFeedback } from "@/shared/ui";
import { GlassGroup, StepHero } from "./glass";
import { StepFooter } from "./step-footer";

const CHANNEL_TINTS: Record<SocialChannel, string> = {
  whatsapp: "from-[#3fe07b] to-[#1ea952]",
  instagram: "from-[#f9a13a] via-[#e1306c] to-[#833ab4]",
  facebook: "from-[#3b8cff] to-[#1464e0]",
  gmail: "from-[#ff6a5c] to-[#d93025]",
};

function ChannelGlyph({ channel }: { channel: SocialChannel }) {
  const cls = "h-[22px] w-[22px]";
  if (channel === "whatsapp") return <MessageCircle className={cls} strokeWidth={1.75} />;
  if (channel === "gmail") return <Mail className={cls} strokeWidth={1.75} />;
  if (channel === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
      <path
        d="M14 8h3V4.5h-3c-2.5 0-4.5 2-4.5 4.5v1.5H7V14h2.5v7.5H14V14h2.8l.7-4H14V9c0-.6.4-1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

type Props = {
  overview: SetupOverview;
  repository: SetupRepository;
  onBack: (() => void) | null;
  /** Called after the channels step is settled and setup is completed. */
  onFinish: (next: SetupOverview) => void;
};

export function ChannelsStep({ repository, onBack, onFinish }: Props) {
  const t = useTranslations("setup.channels");
  const ti = useTranslations("inboxSetup.channels");
  const branchId = useActiveBranchId();
  const feedback = useMutationFeedback();
  const conversations = useMemo(() => createConversationRepository(branchId), [branchId]);
  const health = useApiQuery(() => conversations.channelHealth(), [conversations]);
  const [dialog, setDialog] = useState<SocialChannel | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const connected = new Set(
    (health.data ?? []).filter((a) => a.connected).map((a) => a.provider as SocialChannel),
  );

  async function connect(credentials: ConnectCredentials) {
    if (!dialog) return;
    setConnecting(true);
    try {
      const result = await conversations.connectChannel(dialog, credentials);
      await health.refresh();
      return result;
    } finally {
      setConnecting(false);
    }
  }

  async function finish(skip: boolean) {
    setBusy(true);
    try {
      await repository.advance("channels", skip);
      onFinish(await repository.complete());
    } catch (err) {
      feedback.error(err, t("finishError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepHero icon={MessageCircle} tint="channels" title={t("title")} subtitle={t("subtitle")} />

      <GlassGroup footer={t("laterHint")}>
        <div className="grid grid-cols-2 gap-3 p-3">
          {SOCIAL_CHANNELS.map((ch) => {
            const on = connected.has(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setDialog(ch)}
                data-testid={`setup-channel-${ch}`}
                className="group flex items-center gap-3 rounded-[16px] bg-white/70 p-3 text-start shadow-[0_0_0_0.5px_rgba(15,23,42,0.06)] transition-all duration-200 hover:bg-white active:scale-[0.98]"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-8px_rgba(15,23,42,0.5)]",
                    CHANNEL_TINTS[ch],
                  )}
                >
                  <ChannelGlyph channel={ch} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-zinc-950">{ti(`${ch}.name`)}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] font-medium",
                      on ? "text-emerald-600" : "text-zinc-500",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-emerald-500" : "bg-zinc-300")} />
                    {on ? t("connected") : t("notConnected")}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 rtl:rotate-180" />
              </button>
            );
          })}
        </div>
      </GlassGroup>

      <StepFooter
        onBack={onBack}
        primaryLabel={t("finish")}
        onPrimary={() => void finish(false)}
        disabled={connected.size === 0}
        busy={busy || health.loading}
        secondary={{ label: t("skip"), onClick: () => void finish(true) }}
      />

      <ConnectChannelDialog
        open={dialog !== null}
        channel={dialog}
        busy={connecting}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onSubmit={connect}
      />
    </div>
  );
}
