"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import {
  AI_PROVIDERS,
  aiErrorCode,
  createAIRepository,
  type AIProvider,
  type AISetup,
} from "@/entities/ai";
import { cn } from "@/shared/lib/cn";
import { Button, useToast, useMutationFeedback } from "@/shared/ui";

type Props = {
  initial?: AISetup | null;
  onSaved?: (setup: AISetup) => void;
};

type FieldErrors = { apiKey?: string; model?: string };

const inputClass =
  "h-11 w-full rounded-xl border bg-zinc-50 px-3 text-sm font-medium text-zinc-950";

/** Compact BYO AI key form (reusable in branch wizard + /setup/ai). */
export function AIProviderForm({ initial, onSaved }: Props) {
  const t = useTranslations("aiSetup");
  const tErr = useTranslations("errors");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const repo = useMemo(() => createAIRepository(), []);
  const [provider, setProvider] = useState<AIProvider>(
    (initial?.provider as AIProvider) || "openai",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial?.model ?? "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const keyHint = initial?.keyHint ?? "";
  const models = AI_PROVIDERS.find((p) => p.id === provider)?.models ?? [];
  const listId = `ai-models-${provider}`;

  function chooseProvider(next: AIProvider) {
    if (next === provider) return;
    setProvider(next);
    setModel("");
    setErrors({});
  }

  async function save() {
    setErrors({});
    const bodyKey = apiKey.trim();
    if (!bodyKey && !initial?.configured) {
      setErrors({ apiKey: t("keyRequired") });
      return;
    }
    setBusy(true);
    try {
      const setup = await repo.completeSetup({
        provider,
        apiKey: bodyKey,
        model: model.trim() || undefined,
      });
      setApiKey("");
      setModel(setup.model ?? "");
      onSaved?.(setup);
      push({ title: t("saved"), tone: "success" });
    } catch (err) {
      const code = aiErrorCode(err);
      if (code === "ai_model_not_found") {
        setErrors({ model: tErr(`codes.${code}`) });
      } else if (code === "ai_key_invalid" || code === "ai_rate_limited") {
        setErrors({ apiKey: tErr(`codes.${code}`) });
      } else {
        feedback.error(err, t("saveError"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="ai-provider-form">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {t("chooseProvider")}
      </p>
      <div className="grid gap-2" role="radiogroup" aria-label={t("chooseProvider")}>
        {AI_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={provider === p.id}
            onClick={() => chooseProvider(p.id)}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-start transition",
              provider === p.id
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 hover:border-zinc-300",
            )}
          >
            <span className="text-sm font-semibold">{p.label}</span>
            <span className="text-xs font-medium text-zinc-400">{p.hint}</span>
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <KeyRound className="h-3.5 w-3.5" />
          {t("apiKey")}
        </span>
        <input
          type="password"
          autoComplete="off"
          name="ai-api-key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            keyHint
              ? t("keyPlaceholderKeep", { hint: keyHint })
              : t("keyPlaceholder")
          }
          aria-invalid={Boolean(errors.apiKey)}
          className={cn(inputClass, errors.apiKey ? "border-rose-400" : "border-zinc-200")}
        />
        {errors.apiKey ? (
          <span role="alert" className="block text-xs font-medium text-rose-600">
            {errors.apiKey}
          </span>
        ) : null}
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-500">
          {t("modelOptional")}
        </span>
        <input
          type="text"
          name="ai-model"
          list={listId}
          autoComplete="off"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={models[0] ?? t("modelPlaceholder")}
          aria-invalid={Boolean(errors.model)}
          className={cn(inputClass, errors.model ? "border-rose-400" : "border-zinc-200")}
        />
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        {errors.model ? (
          <span role="alert" className="block text-xs font-medium text-rose-600">
            {errors.model}
          </span>
        ) : models[0] ? (
          <span className="block text-xs text-zinc-400">
            {t("modelHint", { model: models[0] })}
          </span>
        ) : null}
      </label>

      <p className="text-xs text-zinc-400">{t("verifyNote")}</p>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? t("verifying") : t("save")}
      </Button>
    </div>
  );
}
