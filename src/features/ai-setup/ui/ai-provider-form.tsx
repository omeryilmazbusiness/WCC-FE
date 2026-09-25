"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import {
  AI_PROVIDERS,
  createAIRepository,
  type AIProvider,
  type AISetup,
} from "@/entities/ai";
import { cn } from "@/shared/lib/cn";
import { Button, useToast } from "@/shared/ui";

type Props = {
  initial?: AISetup | null;
  onSaved?: (setup: AISetup) => void;
};

/** Compact BYO AI key form (reusable in branch wizard + /setup/ai). */
export function AIProviderForm({ initial, onSaved }: Props) {
  const t = useTranslations("aiSetup");
  const { push } = useToast();
  const repo = useMemo(() => createAIRepository(), []);
  const [provider, setProvider] = useState<AIProvider>(
    (initial?.provider as AIProvider) || "openai",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial?.model ?? "");
  const [busy, setBusy] = useState(false);
  const keyHint = initial?.keyHint ?? "";

  async function save() {
    setBusy(true);
    try {
      const bodyKey = apiKey.trim();
      if (!bodyKey && !initial?.configured) {
        push({ title: t("keyRequired"), tone: "error" });
        return;
      }
      const setup = await repo.completeSetup({
        provider,
        apiKey: bodyKey,
        model: model.trim() || undefined,
      });
      setApiKey("");
      onSaved?.(setup);
      push({ title: t("saved"), tone: "success" });
    } catch {
      push({ title: t("saveError"), tone: "error" });
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
            onClick={() => setProvider(p.id)}
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
          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-950"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-500">
          {t("modelOptional")}
        </span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={t("modelPlaceholder")}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-950"
        />
      </label>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? t("saving") : t("save")}
      </Button>
    </div>
  );
}
