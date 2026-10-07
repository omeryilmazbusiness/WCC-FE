"use client";

import type { ReactNode } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { isAIProvider, type AIRepository, type AISetup } from "@/entities/ai";
import { Button, useMutationFeedback, useToast } from "@/shared/ui";
import { useAISetupForm } from "../model/use-ai-setup-form";
import { ApiKeyField } from "./api-key-field";
import { ModelPicker } from "./model-picker";
import { ProviderPicker } from "./provider-picker";

type Props = {
  repo: Pick<AIRepository, "completeSetup">;
  initial: AISetup | null;
  onSaved: (setup: AISetup) => void;
};

/** Connect a provider in three numbered steps; the server verifies the key before saving. */
export function AIProviderForm({ repo, initial, onSaved }: Props) {
  const t = useTranslations("aiSetup");
  const tErr = useTranslations("errors");
  const feedback = useMutationFeedback();
  const { push } = useToast();
  const form = useAISetupForm({
    repo,
    initial,
    onSaved: (setup) => {
      if (setup.verification === "throttled") {
        push({ title: t("throttled.title"), description: t("throttled.body", { provider: form.info.name }), tone: "info" });
      } else {
        feedback.success(t("saved"), t("savedHint", { provider: form.info.name }));
      }
      onSaved(setup);
    },
    onError: (err) => feedback.error(err, t("saveError")),
  });
  const connected = isAIProvider(initial?.provider) && initial?.configured ? initial.provider : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
      className="space-y-6"
      data-testid="ai-provider-form"
    >
      <Step n={1} title={t("chooseProvider")}>
        <ProviderPicker value={form.provider} connected={connected} onChange={form.chooseProvider} />
      </Step>
      <Step n={2} title={t("stepKey")}>
        <ApiKeyField
          info={form.info}
          value={form.apiKey}
          onChange={form.setApiKey}
          issue={form.keyIssue}
          serverMessage={form.server?.field === "apiKey" ? tErr(`codes.${form.server.code}`) : undefined}
          suggested={form.suggested}
          onSwitch={form.chooseProvider}
          storedHint={initial?.keyHint ?? ""}
          canKeep={form.canKeep}
          mode={form.keyMode}
          onModeChange={form.setKeyMode}
        />
      </Step>
      <Step n={3} title={t("stepModel")}>
        <ModelPicker
          key={form.provider}
          models={form.info.models}
          value={form.model}
          onChange={form.setModel}
          error={form.server?.field === "model" ? tErr(`codes.${form.server.code}`) : undefined}
        />
      </Step>
      <div className="space-y-2.5">
        <Button type="submit" disabled={form.busy} className="h-12 w-full rounded-2xl text-[15px] font-semibold" data-testid="ai-connect">
          {form.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
          {form.busy ? t("verifying") : connected ? t("saveChanges") : t("connect")}
        </Button>
        <p className="text-center text-[12px] leading-snug text-zinc-500">{t("verifyNote")}</p>
      </div>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-950">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[12px] font-bold tabular-nums text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
