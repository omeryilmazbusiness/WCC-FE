"use client";

import { useState } from "react";
import {
  AI_PROVIDERS,
  aiErrorCode,
  canKeepKey,
  detectProvider,
  initialProvider,
  keyIssue,
  type AIProvider,
  type AIRepository,
  type AISetup,
  type KeyIssue,
} from "@/entities/ai";

/** Provider rejections the form shows next to a field; anything else goes to `onError`. */
export type ServerIssue =
  | { field: "apiKey"; code: "ai_key_invalid" | "ai_rate_limited" }
  | { field: "model"; code: "ai_model_not_found" };

type Options = {
  repo: Pick<AIRepository, "completeSetup">;
  initial: AISetup | null;
  onSaved: (setup: AISetup) => void;
  onError: (err: unknown) => void;
};

/** `keep` reuses the stored key (only offered for its own provider); `replace` sends a new one. */
export type KeyMode = "keep" | "replace";

/** State and submit rules of the BYO provider form, free of any markup. */
export function useAISetupForm({ repo, initial, onSaved, onError }: Options) {
  const [provider, setProvider] = useState<AIProvider>(() => initialProvider(initial));
  const [apiKey, setApiKeyState] = useState("");
  const [model, setModelState] = useState(initial?.model ?? "");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [server, setServer] = useState<ServerIssue | null>(null);
  const [mode, setMode] = useState<KeyMode>("keep");

  const info = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];
  const canKeep = canKeepKey(initial, provider);
  const keyMode: KeyMode = canKeep ? mode : "replace";
  const sentKey = keyMode === "keep" ? "" : apiKey.trim();
  const issue: KeyIssue | null = keyMode === "keep" ? null : keyIssue({ provider, key: apiKey, stored: null });
  const suggested = issue === "mismatch" ? detectProvider(apiKey) : null;

  function chooseProvider(next: AIProvider) {
    if (next === provider) return;
    setProvider(next);
    setModelState(next === initial?.provider ? initial.model : "");
    setServer(null);
  }

  /** Switching back to `keep` drops whatever was typed, so a half-pasted key is never sent. */
  function setKeyMode(next: KeyMode) {
    setMode(next);
    setTouched(false);
    if (server?.field === "apiKey") setServer(null);
    if (next === "keep") setApiKeyState("");
  }

  function setApiKey(value: string) {
    setApiKeyState(value);
    if (server?.field === "apiKey") setServer(null);
  }

  function setModel(value: string) {
    setModelState(value);
    if (server?.field === "model") setServer(null);
  }

  async function submit(): Promise<boolean> {
    setTouched(true);
    if (issue || busy) return false;
    setBusy(true);
    setServer(null);
    try {
      const saved = await repo.completeSetup({ provider, apiKey: sentKey, model: model.trim() || undefined });
      setApiKeyState("");
      setMode("keep");
      setModelState(saved.model ?? "");
      setTouched(false);
      onSaved(saved);
      return true;
    } catch (err) {
      const code = aiErrorCode(err);
      if (code === "ai_model_not_found") setServer({ field: "model", code });
      else if (code === "ai_key_invalid" || code === "ai_rate_limited") setServer({ field: "apiKey", code });
      else onError(err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    provider,
    info,
    apiKey,
    model,
    busy,
    /** Local key problem, shown once the user tried to submit. */
    keyIssue: touched ? issue : issue === "mismatch" ? issue : null,
    suggested,
    /** A key for this provider is stored, so the user may keep it or replace it. */
    canKeep,
    keyMode,
    setKeyMode,
    server,
    chooseProvider,
    setApiKey,
    setModel,
    submit,
  };
}

export type AISetupForm = ReturnType<typeof useAISetupForm>;
