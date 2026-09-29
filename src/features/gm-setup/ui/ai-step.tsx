"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Sparkles } from "lucide-react";
import { AI_PROVIDERS, createAIRepository, type AIProvider } from "@/entities/ai";
import type { SetupOverview, SetupRepository } from "@/entities/setup";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { cn } from "@/shared/lib/cn";
import { useMutationFeedback } from "@/shared/ui";
import { GlassField, GlassGroup, GlassInput, PillButton, StepHero } from "./glass";
import { StepFooter } from "./step-footer";

type Props = {
  overview: SetupOverview;
  repository: SetupRepository;
  onBack: (() => void) | null;
  onDone: (next: SetupOverview) => void;
};

const ai = createAIRepository();

export function AIStep({ repository, onBack, onDone }: Props) {
  const t = useTranslations("setup.ai");
  const feedback = useMutationFeedback();
  const setup = useApiQuery(() => ai.getSetup(), []);
  const ready = Boolean(setup.data?.configured && setup.data?.enabled);
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [keyError, setKeyError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const showForm = !ready || editing;
  const hint = AI_PROVIDERS.find((p) => p.id === provider)?.hint ?? "";

  async function advance(skip: boolean) {
    setBusy(true);
    try {
      onDone(await repository.advance("ai", skip));
    } catch (err) {
      feedback.error(err, t("advanceError"));
    } finally {
      setBusy(false);
    }
  }

  async function primary() {
    if (!showForm) return advance(false);
    if (apiKey.trim().length < 8) {
      setKeyError(t("errors.key"));
      return;
    }
    setBusy(true);
    try {
      const next = await ai.completeSetup({ provider, apiKey: apiKey.trim(), model: model.trim() || undefined });
      setup.setData(next);
      setApiKey("");
      setEditing(false);
      onDone(await repository.advance("ai"));
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepHero icon={Sparkles} tint="ai" title={t("title")} subtitle={t("subtitle")} />

      {ready && !editing ? (
        <GlassGroup>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-zinc-950">{t("connected")}</p>
              <p className="truncate text-[12px] text-zinc-500">
                {[AI_PROVIDERS.find((p) => p.id === setup.data?.provider)?.label, setup.data?.model, setup.data?.keyHint]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <PillButton variant="plain" onClick={() => setEditing(true)}>
              {t("change")}
            </PillButton>
          </div>
        </GlassGroup>
      ) : (
        <>
          <GlassGroup title={t("provider")}>
            <div role="radiogroup" aria-label={t("provider")} className="grid grid-cols-3 gap-3 p-3">
              {AI_PROVIDERS.map((p) => {
                const active = p.id === provider;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setProvider(p.id)}
                    data-testid={`setup-ai-${p.id}`}
                    className={cn(
                      "flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-2 py-3 text-center transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "bg-white text-zinc-950 shadow-[0_0_0_2px_rgba(14,165,233,0.55),0_8px_18px_-12px_rgba(15,23,42,0.4)]"
                        : "bg-white/50 text-zinc-600 shadow-[0_0_0_0.5px_rgba(15,23,42,0.08)] hover:bg-white/80",
                    )}
                  >
                    <span className="text-[13px] font-semibold leading-tight">{t(`providers.${p.id}`)}</span>
                    <span className="font-mono text-[10px] text-zinc-400">{p.hint}</span>
                  </button>
                );
              })}
            </div>
          </GlassGroup>

          <GlassGroup footer={t("keyHint")}>
            <GlassField id="setup-ai-key" label={t("apiKey")} error={keyError}>
              <GlassInput
                id="setup-ai-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={apiKey}
                invalid={Boolean(keyError)}
                placeholder={hint}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyError(undefined);
                }}
                data-testid="setup-ai-key"
              />
            </GlassField>
            <GlassField id="setup-ai-model" label={t("model")}>
              <GlassInput
                id="setup-ai-model"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={model}
                placeholder={t("modelPlaceholder")}
                onChange={(e) => setModel(e.target.value)}
              />
            </GlassField>
          </GlassGroup>
        </>
      )}

      <StepFooter
        onBack={editing ? () => setEditing(false) : onBack}
        primaryLabel={showForm ? t("connect") : t("continue")}
        onPrimary={() => void primary()}
        busy={busy || setup.loading}
        secondary={ready ? undefined : { label: t("skip"), onClick: () => void advance(true) }}
      />
    </div>
  );
}
