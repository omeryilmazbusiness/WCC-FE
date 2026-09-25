"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Mail, MessageCircle } from "lucide-react";
import {
  SOCIAL_CHANNELS,
  type ChannelHealth,
  type ConnectCredentials,
  type ConversationRepository,
  type SocialChannel,
} from "@/entities/conversation";
import { ConnectChannelDialog } from "@/features/inbox-setup/ui/connect-channel-dialog";
import { cn } from "@/shared/lib/cn";
import { useToast } from "@/shared/ui";

type Props = {
  repository: ConversationRepository;
  accounts: ChannelHealth[];
  onAccountsChange: (accounts: ChannelHealth[]) => void;
};

function ChannelGlyph({
  channel,
  className,
}: {
  channel: SocialChannel;
  className?: string;
}) {
  if (channel === "whatsapp") {
    return <MessageCircle className={className} strokeWidth={1.5} />;
  }
  if (channel === "gmail") {
    return <Mail className={className} strokeWidth={1.5} />;
  }
  if (channel === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M14 8h3V4.5h-3c-2.5 0-4.5 2-4.5 4.5v1.5H7V14h2.5v7.5H14V14h2.8l.7-4H14V9c0-.6.4-1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChannelsStepPanel({
  repository,
  accounts,
  onAccountsChange,
}: Props) {
  const t = useTranslations("branchSetup");
  const ti = useTranslations("inboxSetup");
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [dialogChannel, setDialogChannel] = useState<SocialChannel | null>(
    null,
  );
  const connected = useMemo(
    () => accounts.filter((a) => a.connected).length,
    [accounts],
  );

  async function submitConnect(
    provider: SocialChannel,
    credentials: ConnectCredentials,
  ) {
    setBusy(true);
    try {
      await repository.connectChannel(provider, credentials);
      onAccountsChange(await repository.channelHealth());
      push({
        title: ti("connectedToast", {
          channel: ti(`channels.${provider}.name`),
        }),
        tone: "success",
      });
    } catch {
      push({ title: ti("connectError"), tone: "error" });
      throw new Error("connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="channels-step-panel">
      <p className="text-center text-[13px] text-zinc-400">
        {t("channelsConnected", { count: connected })}
      </p>

      <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-100">
        {SOCIAL_CHANNELS.map((ch, i) => {
          const ok = accounts.some((a) => a.provider === ch && a.connected);
          return (
            <li key={ch}>
              <button
                type="button"
                onClick={() => setDialogChannel(ch)}
                className={cn(
                  "flex w-full items-center gap-4 px-4 py-4 text-start transition active:bg-zinc-50",
                  i > 0 && "border-t border-zinc-100",
                )}
              >
                {ok ? (
                  <Check className="h-6 w-6 shrink-0 text-emerald-500" strokeWidth={2} />
                ) : (
                  <ChannelGlyph
                    channel={ch}
                    className="h-6 w-6 shrink-0 text-zinc-700"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] text-zinc-900">
                    {ti(`channels.${ch}.name`)}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-zinc-400">
                    {ok ? t("connected") : t("connect")}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-zinc-300" strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
      </ul>

      <ConnectChannelDialog
        open={dialogChannel !== null}
        channel={dialogChannel}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setDialogChannel(null);
        }}
        onSubmit={async (credentials) => {
          if (!dialogChannel) return;
          await submitConnect(dialogChannel, credentials);
          setDialogChannel(null);
        }}
      />
    </div>
  );
}
