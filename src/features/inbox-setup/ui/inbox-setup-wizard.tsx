"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  KeyRound,
  Link2,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  ChannelHealth,
  ConnectCredentials,
  ConversationRepository,
  SocialChannel,
} from "@/entities/conversation";
import { SOCIAL_CHANNELS } from "@/entities/conversation";
import { cn } from "@/shared/lib/cn";
import { Button, useToast } from "@/shared/ui";
import { ConnectChannelDialog } from "./connect-channel-dialog";

type StepId = "welcome" | SocialChannel | "ready";

const STEPS: StepId[] = [
  "welcome",
  "whatsapp",
  "instagram",
  "facebook",
  "gmail",
  "ready",
];

type Props = {
  repository: ConversationRepository;
  accounts: ChannelHealth[];
  onAccountsChange: (accounts: ChannelHealth[]) => void;
  onComplete: () => void;
};

type TSetup = ReturnType<typeof useTranslations<"inboxSetup">>;

function ChannelGlyph({
  channel,
  className,
}: {
  channel: SocialChannel;
  className?: string;
}) {
  if (channel === "whatsapp") {
    return <MessageCircle className={className} strokeWidth={1.6} />;
  }
  if (channel === "gmail") {
    return <Mail className={className} strokeWidth={1.6} />;
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
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="1.7" />
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

const ICON: Record<SocialChannel, string> = {
  whatsapp: "bg-emerald-500/10 text-emerald-700",
  instagram: "bg-rose-500/10 text-rose-700",
  facebook: "bg-sky-500/10 text-sky-700",
  gmail: "bg-red-500/10 text-red-700",
};

export function InboxSetupWizard({
  repository,
  accounts,
  onAccountsChange,
  onComplete,
}: Props) {
  const t = useTranslations("inboxSetup");
  const { push } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dialogChannel, setDialogChannel] = useState<SocialChannel | null>(null);

  const step = STEPS[stepIndex] ?? "welcome";
  const connectedCount = useMemo(
    () => accounts.filter((a) => a.connected).length,
    [accounts],
  );

  function accountFor(provider: SocialChannel) {
    return accounts.find((a) => a.provider === provider);
  }

  async function submitConnect(
    provider: SocialChannel,
    credentials: ConnectCredentials,
  ): Promise<ChannelHealth> {
    setBusy(true);
    try {
      const health = await repository.connectChannel(provider, credentials);
      onAccountsChange(await repository.channelHealth());
      push({
        title: t("connectedToast", { channel: t(`channels.${provider}.name`) }),
        tone: "success",
      });
      return health;
    } catch (err) {
      push({ title: t("connectError"), tone: "error" });
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className="mx-auto w-full max-w-3xl rounded-[28px] border border-zinc-200/80 bg-white shadow-[0_20px_50px_-28px_rgba(24,24,27,0.35)]"
        data-testid="inbox-setup-wizard"
      >
        <div className="border-b border-zinc-100 px-5 py-6 sm:px-10 sm:py-8">
          <ProgressRail t={t} stepIndex={stepIndex} accounts={accounts} />
        </div>

        <div
          key={step}
          className="min-h-[360px] px-6 py-10 sm:min-h-[400px] sm:px-12 sm:py-14"
        >
          {step === "welcome" ? (
            <WelcomePanel t={t} />
          ) : step === "ready" ? (
            <ReadyPanel
              t={t}
              accounts={accounts}
              connectedCount={connectedCount}
            />
          ) : (
            <ChannelPanel
              t={t}
              channel={step}
              connected={Boolean(accountFor(step)?.connected)}
              onConnect={() => setDialogChannel(step)}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-6 py-5 sm:px-12 sm:py-6">
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3 text-zinc-500"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
          >
            {t("back")}
          </Button>
          <div className="flex items-center gap-3">
            {step !== "welcome" && step !== "ready" ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 text-zinc-500"
                onClick={() => setStepIndex((i) => i + 1)}
              >
                {t("skip")}
              </Button>
            ) : null}
            {step === "ready" ? (
              <Button
                type="button"
                className="h-12 min-w-[160px] text-base"
                disabled={connectedCount === 0}
                onClick={onComplete}
                data-testid="inbox-setup-finish"
              >
                {t("openInbox")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 min-w-[140px] text-base"
                onClick={() =>
                  setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
                }
              >
                {t("continue")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConnectChannelDialog
        open={dialogChannel !== null}
        channel={dialogChannel}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setDialogChannel(null);
        }}
        onSubmit={async (credentials) => {
          if (!dialogChannel) return;
          return submitConnect(dialogChannel, credentials);
        }}
      />
    </>
  );
}

/** Single horizontal row of round step icons — never stacks */
function ProgressRail({
  t,
  stepIndex,
  accounts,
}: {
  t: TSetup;
  stepIndex: number;
  accounts: ChannelHealth[];
}) {
  return (
    <nav aria-label={t("progressLabel")} className="w-full">
      <ol className="flex w-full flex-row flex-nowrap items-center">
        {STEPS.map((id, i) => {
          const active = i === stepIndex;
          const done = i < stepIndex;
          const channelDone =
            id !== "welcome" &&
            id !== "ready" &&
            accounts.some((a) => a.provider === id && a.connected);
          const complete = done || channelDone;
          const label =
            id === "welcome" || id === "ready"
              ? t(`steps.${id}`)
              : t(`channels.${id}.name`);

          return (
            <li
              key={id}
              className="flex min-w-0 flex-1 flex-row items-center"
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-px min-w-[8px] flex-1 sm:mx-2",
                    complete || active ? "bg-zinc-300" : "bg-zinc-100",
                  )}
                />
              ) : null}

              <button
                type="button"
                title={label}
                aria-current={active ? "step" : undefined}
                aria-label={label}
                className={cn(
                  "mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:h-14 sm:w-14",
                  complete
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-400",
                )}
              >
                {complete ? (
                  <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                ) : id === "welcome" ? (
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.7} />
                ) : id === "ready" ? (
                  <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                ) : (
                  <ChannelGlyph
                    channel={id}
                    className="h-5 w-5 sm:h-6 sm:w-6"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-center text-sm font-medium text-zinc-500 sm:text-base">
        {(() => {
          const id = STEPS[stepIndex]!;
          if (id === "welcome" || id === "ready") return t(`steps.${id}`);
          return t(`channels.${id}.name`);
        })()}
      </p>
    </nav>
  );
}

function WelcomePanel({ t }: { t: TSetup }) {
  const firmSteps = [
    { icon: Users, text: t("firm.step1"), tone: "text-sky-700 bg-sky-500/10" },
    {
      icon: KeyRound,
      text: t("firm.step2"),
      tone: "text-amber-800 bg-amber-500/10",
    },
    {
      icon: Link2,
      text: t("firm.step3"),
      tone: "text-emerald-700 bg-emerald-500/10",
    },
    {
      icon: ShieldCheck,
      text: t("firm.step4"),
      tone: "text-rose-700 bg-rose-500/10",
    },
  ] as const;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-12">
      <header className="space-y-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {t("welcomeTitle")}
        </h2>
        <p className="mx-auto max-w-lg text-lg leading-relaxed text-zinc-500">
          {t("welcomeBody")}
        </p>
      </header>

      <ul className="grid gap-8 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-10">
        {firmSteps.map(({ icon: Icon, text, tone }, i) => (
          <li key={i} className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                tone,
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={1.6} />
            </span>
            <div className="min-w-0 space-y-1 pt-1">
              <p className="text-sm font-semibold text-zinc-400">
                {t("stepLabel", { n: i + 1 })}
              </p>
              <p className="text-lg font-medium leading-snug text-zinc-800">
                {text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChannelPanel({
  t,
  channel,
  connected,
  onConnect,
}: {
  t: TSetup;
  channel: SocialChannel;
  connected: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-12">
      <header className="flex flex-col items-center gap-5 text-center">
        <span
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-[22px]",
            ICON[channel],
          )}
        >
          <ChannelGlyph channel={channel} className="h-10 w-10" />
        </span>
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {t(`channels.${channel}.title`)}
          </h2>
          <p className="text-lg leading-relaxed text-zinc-500">
            {t(`channels.${channel}.body`)}
          </p>
        </div>
      </header>

      <ol className="space-y-7">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold",
                ICON[channel],
              )}
            >
              {n}
            </span>
            <p className="pt-1.5 text-lg leading-snug text-zinc-700">
              {t(`channels.${channel}.step${n}`)}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-4">
        {connected ? (
          <div className="flex items-center gap-3 text-lg font-semibold text-emerald-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </span>
            {t("alreadyConnected")}
          </div>
        ) : (
          <Button
            type="button"
            className="h-14 w-full max-w-sm text-base sm:text-lg"
            onClick={onConnect}
            data-testid={`connect-${channel}`}
          >
            {t("connect", { channel: t(`channels.${channel}.name`) })}
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
        <p className="max-w-sm text-center text-sm leading-relaxed text-zinc-400 sm:text-base">
          {t("oauthNote")}
        </p>
      </div>
    </div>
  );
}

function ReadyPanel({
  t,
  accounts,
  connectedCount,
}: {
  t: TSetup;
  accounts: ChannelHealth[];
  connectedCount: number;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-12">
      <header className="space-y-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {t("readyTitle")}
        </h2>
        <p className="mx-auto max-w-md text-lg leading-relaxed text-zinc-500">
          {connectedCount === 0
            ? t("readyEmpty")
            : t("readyBody", { count: connectedCount })}
        </p>
      </header>

      <ul className="grid gap-8 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-10">
        {SOCIAL_CHANNELS.map((ch) => {
          const on = accounts.some((a) => a.provider === ch && a.connected);
          return (
            <li key={ch} className="flex items-center gap-4">
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  ICON[ch],
                )}
              >
                <ChannelGlyph channel={ch} className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-zinc-900">
                  {t(`channels.${ch}.name`)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    on ? "text-emerald-600" : "text-zinc-400",
                  )}
                >
                  {on ? t("statusOn") : t("statusOff")}
                </p>
              </div>
              {on ? (
                <Check
                  className="h-6 w-6 shrink-0 text-emerald-600"
                  strokeWidth={2.5}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
