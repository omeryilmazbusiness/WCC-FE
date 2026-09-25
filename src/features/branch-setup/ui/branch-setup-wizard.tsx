"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Check,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import type { AISetup } from "@/entities/ai";
import {
  createConversationRepository,
  type ChannelHealth,
} from "@/entities/conversation";
import { useSessionUser } from "@/shared/api/session-context";
import { cn } from "@/shared/lib/cn";
import {
  BRANCH_SETUP_STEPS,
  isStepComplete,
  nextBranchSetupStep,
  prevBranchSetupStep,
  type BranchSetupFacts,
  type BranchSetupStep,
} from "../model/setup-status";
import { ChannelsStepPanel } from "./channels-step-panel";
import { OrgStepPanel } from "./org-step-panel";
import { AIProviderForm } from "@/features/ai-setup/ui/ai-provider-form";

type Props = {
  aiSetup: AISetup | null;
  onAiChange: (setup: AISetup) => void;
  accounts: ChannelHealth[];
  onAccountsChange: (accounts: ChannelHealth[]) => void;
  orgFacts: Pick<BranchSetupFacts, "companyNamed" | "staffRolesPresent">;
  onOrgChange: (
    facts: Pick<BranchSetupFacts, "companyNamed" | "staffRolesPresent">,
  ) => void;
  onSkip: () => void;
  onFinished: () => void;
};

const STEP_ICON: Record<BranchSetupStep, typeof Building2> = {
  org: Building2,
  ai: Sparkles,
  channels: MessageSquare,
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';

export function BranchSetupWizard({
  aiSetup,
  onAiChange,
  accounts,
  onAccountsChange,
  orgFacts,
  onOrgChange,
  onSkip,
  onFinished,
}: Props) {
  const t = useTranslations("branchSetup");
  const user = useSessionUser();
  const repository = useMemo(
    () => createConversationRepository(user.branchId),
    [user.branchId],
  );

  const facts: BranchSetupFacts = useMemo(
    () => ({
      companyNamed: orgFacts.companyNamed,
      staffRolesPresent: orgFacts.staffRolesPresent,
      aiConfigured: Boolean(aiSetup?.configured),
      aiEnabled: Boolean(aiSetup?.enabled),
      channelsConnected: accounts.filter((a) => a.connected).length,
      dismissed: false,
    }),
    [aiSetup, accounts, orgFacts],
  );

  const [step, setStep] = useState<BranchSetupStep>("org");
  const stepIndex = BRANCH_SETUP_STEPS.indexOf(step);
  const showFooterContinue = step !== "org";

  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-[32px] bg-[#FAFAFA]"
      data-testid="branch-setup-wizard"
      style={{
        fontFamily: FONT,
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}
    >
      {/* Top bar — skip | close */}
      <div className="flex items-center justify-between px-6 pt-5">
        <button
          type="button"
          onClick={onSkip}
          className="text-[15px] text-zinc-400 transition hover:text-zinc-600"
          data-testid="branch-setup-skip"
        >
          {t("skip")}
        </button>
        <button
          type="button"
          aria-label={t("skip")}
          onClick={onSkip}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600"
          data-testid="branch-setup-dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Title — centered */}
      <div className="px-8 pb-2 pt-3 text-center">
        <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h2>
      </div>

      {/* Step icons — large, symmetrical, frameless */}
      <div className="flex items-center justify-center gap-10 px-8 py-5">
        {BRANCH_SETUP_STEPS.map((id) => {
          const Icon = STEP_ICON[id];
          const active = step === id;
          const done = isStepComplete(id, facts);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStep(id)}
              aria-current={active ? "step" : undefined}
              aria-label={t(`steps.${id}`)}
              className="flex flex-col items-center gap-2"
            >
              {done && !active ? (
                <Check
                  className="h-9 w-9 text-emerald-500"
                  strokeWidth={2}
                />
              ) : (
                <Icon
                  className={cn(
                    "h-9 w-9 transition-colors",
                    active ? "text-zinc-900" : "text-zinc-300",
                  )}
                  strokeWidth={1.4}
                />
              )}
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-zinc-800" : "text-zinc-400",
                )}
              >
                {t(`steps.${id}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Soft page dots */}
      <div className="flex justify-center gap-1.5 pb-2">
        {BRANCH_SETUP_STEPS.map((id, i) => (
          <span
            key={id}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === stepIndex ? "w-5 bg-zinc-800" : "w-1 bg-zinc-300",
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[360px] px-6 pb-6 pt-4">
        {step === "org" ? (
          <OrgStepPanel
            onChanged={onOrgChange}
            onContinueToAi={() => setStep("ai")}
          />
        ) : null}

        {step === "ai" ? (
          <div className="space-y-6">
            <div className="text-center">
              <Sparkles
                className="mx-auto h-14 w-14 text-zinc-800"
                strokeWidth={1.25}
              />
              <h3 className="mt-4 text-[20px] font-semibold tracking-tight text-zinc-900">
                {t("steps.ai")}
              </h3>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-zinc-400">
                {t("aiBody")}
              </p>
            </div>
            {isStepComplete("ai", facts) ? (
              <p className="text-center text-[14px] font-medium text-emerald-600">
                {t("aiReady", {
                  provider: aiSetup?.provider || "—",
                  hint: aiSetup?.keyHint || "••••",
                })}
              </p>
            ) : null}
            <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-100">
              <AIProviderForm initial={aiSetup} onSaved={onAiChange} />
            </div>
          </div>
        ) : null}

        {step === "channels" ? (
          <div className="space-y-6">
            <div className="text-center">
              <MessageSquare
                className="mx-auto h-14 w-14 text-zinc-800"
                strokeWidth={1.25}
              />
              <h3 className="mt-4 text-[20px] font-semibold tracking-tight text-zinc-900">
                {t("steps.channels")}
              </h3>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-zinc-400">
                {t("channelsBody")}
              </p>
            </div>
            <ChannelsStepPanel
              repository={repository}
              accounts={accounts}
              onAccountsChange={onAccountsChange}
            />
          </div>
        ) : null}
      </div>

      {/* Footer — only for AI / Channels (org has its own CTA) */}
      {showFooterContinue ? (
        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          {prevBranchSetupStep(step) ? (
            <button
              type="button"
              onClick={() => {
                const p = prevBranchSetupStep(step);
                if (p) setStep(p);
              }}
              className="text-[15px] font-medium text-zinc-400 transition hover:text-zinc-700"
            >
              {t("back")}
            </button>
          ) : (
            <span />
          )}

          {nextBranchSetupStep(step) ? (
            <button
              type="button"
              onClick={() => {
                const n = nextBranchSetupStep(step);
                if (n) setStep(n);
              }}
              className="h-12 rounded-full bg-zinc-900 px-8 text-[15px] font-semibold text-white transition active:scale-[0.98]"
            >
              {t("continue")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinished}
              data-testid="branch-setup-finish"
              className="h-12 rounded-full bg-zinc-900 px-8 text-[15px] font-semibold text-white transition active:scale-[0.98]"
            >
              {t("finish")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
